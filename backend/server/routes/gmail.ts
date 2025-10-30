import express from 'express';
import { google } from 'googleapis';

import { GmailDB } from '../../db/database.js';

type Header = { name?: string; value?: string };

function extractDetails(payload: any) {
  const headers = (payload?.payload?.headers || []) as Header[];
  const subject = headers.find(
    (h) => h.name?.toLowerCase() === 'subject'
  )?.value;
  const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value;
  const internalDateMs = payload?.internalDate
    ? Number(payload.internalDate)
    : 0;
  const snippet = payload?.snippet as string | undefined;
  return { subject, from, internalDateMs, snippet };
}

export function registerGmailRoutes(app: express.Express, oauth2Client: any) {
  // Gmail polling route (simple incremental fetch)
  app.get('/api/gmail/messages', async (req, res) => {
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const maxSeen = await GmailDB.getMaxInternalDateMs();
      let newMaxSeen = maxSeen;
      let pageToken: string | undefined = undefined;
      let savedCount = 0;

      do {
        const listResp: any = await gmail.users.messages.list({
          userId: 'me',
          q: 'Appointment newer_than:7d',
          maxResults: 100,
          pageToken
        });

        const messages = listResp.data.messages || [];
        for (const msg of messages) {
          if (!msg.id) continue;
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id
          });
          const payload = full.data;
          const { subject, from, internalDateMs, snippet } =
            extractDetails(payload);

          // Dedupe: skip if not newer than max seen
          if (internalDateMs && internalDateMs <= maxSeen) continue;

          await GmailDB.upsertMessage({
            id: msg.id,
            thread_id: payload.threadId || undefined,
            subject: subject || undefined,
            from_address: from || undefined,
            snippet: snippet || undefined,
            internal_date_ms: internalDateMs || undefined
          });
          savedCount += 1;
          if (internalDateMs > newMaxSeen) newMaxSeen = internalDateMs;
        }

        pageToken = listResp.data.nextPageToken || undefined;
      } while (pageToken);

      res.json({ saved: savedCount, maxSeenInternalDateMs: newMaxSeen });
    } catch (error) {
      console.error('Gmail fetch error:', error);
      res.status(500).json({ error: 'Failed to perform incremental fetch' });
    }
  });
}
