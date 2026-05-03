import dotenv from 'dotenv';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  AppointmentSuggestion,
  GmailDB,
  GmailMessageRow
} from '../../db/gmailStore';
import {
  clearGmailOAuthSession,
  isInvalidGrant
} from '../googleOAuthInvalidGrant.js';

dotenv.config();

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const AI_MODEL = process.env.AI_MODEL || 'gemini-3-flash-preview';

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

  let bodyText = '';
  if (payload?.payload) {
    const p = payload.payload;

    if (p.body?.data) {
      bodyText = Buffer.from(p.body.data, 'base64').toString('utf-8');
    } else if (p.parts && Array.isArray(p.parts)) {
      const textParts: string[] = [];
      const htmlParts: string[] = [];

      function extractFromPart(part: any) {
        if (part.body?.data) {
          const decoded = Buffer.from(part.body.data, 'base64').toString(
            'utf-8'
          );
          const mimeType = part.mimeType?.toLowerCase() || '';

          if (mimeType === 'text/plain') textParts.push(decoded);
          else if (mimeType === 'text/html') htmlParts.push(decoded);
        }

        if (part.parts && Array.isArray(part.parts)) {
          part.parts.forEach(extractFromPart);
        }
      }

      p.parts.forEach(extractFromPart);

      // Prefer plain text over HTML
      bodyText =
        textParts.length > 0 ? textParts.join('\n') : htmlParts.join('\n');
    }
  }

  return { subject, from, internalDateMs, snippet, bodyText };
}

async function extractAppointmentDetailsBatch(
  messages: GmailMessageRow[]
): Promise<AppointmentSuggestion[]> {
  if (messages.length === 0) return [];

  const emailBlocks = messages.map((message) => {
    const sentDate = message.internal_date_ms
      ? new Date(message.internal_date_ms).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : null;

    return `---
messageId: ${message.id}
${sentDate ? `Sent: ${sentDate}` : ''}
Subject: ${message.subject}
From: ${message.from_address}

${message.body_text}`;
  });

  const prompt = `You are an assistant that extracts appointment information from emails.
For each email that contains an appointment, meeting, or scheduled event, use the sent date to resolve relative day references like "Wednesday" or "next Friday" to exact dates.
Return a JSON array containing only emails that are appointments. Each element should have:
- messageId: string (the messageId provided above)
- subject: string (the subject line provided above)
- title: string (event title/summary, or null if not found)
- date: string (ISO format YYYY-MM-DD, or null if not found)
- time: string (HH:MM 24-hour format, or null if not found)
- location: string (physical address or virtual meeting link, or null if not found)
- description: string (brief description, or null if not found)
If an email does not contain an appointment, omit it from the array entirely.

Emails:
${emailBlocks.join('\n\n')}`;

  try {
    const model = gemini!.getGenerativeModel({
      model: AI_MODEL,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const response = await model.generateContent(prompt);
    const results = JSON.parse(response.response.text());

    return results.map((r: any) => ({
      messageId: r.messageId,
      subject: r.subject,
      title: r.title,
      date: r.date,
      time: r.time,
      location: r.location,
      description: r.description
    }));
  } catch (error) {
    console.error('Error extracting appointment details:', error);
    return [];
  }
}

export function registerGmailRoutes(
  app: express.Express,
  oauth2Client: OAuth2Client
) {
  app.get('/api/gmail/messages', async (req, res) => {
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const maxSeen = await GmailDB.getMaxInternalDateMs();
      let newMaxSeen = maxSeen;
      let pageToken: string | undefined = undefined;
      let savedCount = 0;

      const baseQuery =
        'subject:(appointment OR confirmation OR interview OR "your visit" OR scheduled OR booking OR reminder)';
      const query =
        maxSeen > 0
          ? `${baseQuery} after:${Math.floor(maxSeen / 1000)}`
          : `${baseQuery} newer_than:7d`;

      do {
        const listResp: any = await gmail.users.messages.list({
          userId: 'me',
          q: query,
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
          const { subject, from, internalDateMs, snippet, bodyText } =
            extractDetails(payload);

          // Dedupe: skip if not newer than max seen (handles edge cases where after: returns same timestamp)
          if (internalDateMs && internalDateMs <= maxSeen) continue;

          await GmailDB.upsertMessage({
            id: msg.id,
            thread_id: payload.threadId || undefined,
            subject: subject || undefined,
            from_address: from || undefined,
            snippet: snippet || undefined,
            internal_date_ms: internalDateMs || undefined,
            body_text: bodyText || undefined
          });
          savedCount += 1;
          if (internalDateMs > newMaxSeen) newMaxSeen = internalDateMs;
        }

        pageToken = listResp.data.nextPageToken || undefined;
      } while (pageToken);

      res.json({ saved: savedCount, maxSeenInternalDateMs: newMaxSeen });
    } catch (error) {
      if (isInvalidGrant(error)) {
        await clearGmailOAuthSession(oauth2Client);
        return res.status(401).json({
          error:
            'Gmail access expired or was revoked. Sign in with Google again.'
        });
      }
      throw error;
    }
  });

  app.get('/api/ai/appointments/suggestions', async (req, res) => {
    if (!gemini) {
      return res
        .status(500)
        .json({ error: 'GEMINI_API_KEY not configured on the server' });
    }

    const messages = await GmailDB.getUnactionedMessages();
    const suggestions = await extractAppointmentDetailsBatch(messages);
    res.json({ count: suggestions.length, suggestions });
  });

  app.get('/api/ai/appointments/suggestions/:messageId', async (req, res) => {
    if (!gemini) {
      return res
        .status(500)
        .json({ error: 'GEMINI_API_KEY not configured on the server' });
    }

    const { messageId } = req.params;
    const message = (await GmailDB.getMessageById(
      messageId
    )) as GmailMessageRow | null;
    if (!message) {
      return res
        .status(404)
        .json({ error: `No stored Gmail message with id ${messageId}` });
    }

    const suggestions = await extractAppointmentDetailsBatch([message]);
    res.json({ messageId, suggestion: suggestions[0] ?? null });
  });
}
