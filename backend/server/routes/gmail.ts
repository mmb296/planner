import dotenv from 'dotenv';
import express from 'express';

import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  AppointmentSuggestion,
  GmailDB,
  GmailMessageRow
} from '../../db/gmailStore';
import { GmailOAuthSession } from '../googleOAuthSession.js';

import type { gmail_v1 } from 'googleapis';

dotenv.config();

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const AI_MODEL = process.env.AI_MODEL || 'gemini-3-flash-preview';

type Header = { name?: string; value?: string };

function extractDetails(payload: gmail_v1.Schema$Message) {
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

      function extractFromPart(part: gmail_v1.Schema$MessagePart) {
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

  return {
    threadId: payload.threadId,
    subject,
    from,
    internalDateMs,
    snippet,
    bodyText
  };
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

export async function syncGmailMessages(
  gmail: gmail_v1.Gmail
): Promise<number> {
  const syncStartMs = Date.now();
  const maxEmailMs = await GmailDB.getMaxInternalDateMs();
  const lastSyncAt = await GmailDB.getLastSyncAt();
  const queryFromMs = Math.max(maxEmailMs, lastSyncAt);
  let pageToken: string | undefined = undefined;
  let savedCount = 0;

  const baseQuery =
    'subject:(appointment OR confirmation OR interview OR "your visit" OR scheduled OR booking OR reminder)';
  const query =
    queryFromMs > 0
      ? `${baseQuery} after:${Math.floor(queryFromMs / 1000)}`
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
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const details = extractDetails(full.data);

      await GmailDB.upsertMessage({
        id: msg.id,
        thread_id: details.threadId || undefined,
        subject: details.subject,
        from_address: details.from,
        snippet: details.snippet,
        internal_date_ms: details.internalDateMs,
        body_text: details.bodyText || undefined
      });
      if (details.internalDateMs > maxEmailMs) savedCount += 1;
    }

    pageToken = listResp.data.nextPageToken || undefined;
  } while (pageToken);

  await GmailDB.setLastSyncAt(syncStartMs);
  return savedCount;
}

export function registerGmailRoutes(
  app: express.Express,
  session: GmailOAuthSession
) {
  app.get('/api/gmail/messages', async (req, res) => {
    const gmail = session.getGmailClient();
    if (!gmail)
      return res
        .status(401)
        .json({ error: 'Gmail not connected. Sign in with Google.' });
    try {
      const saved = await syncGmailMessages(gmail);
      res.json({ saved });
    } catch (error) {
      if (await session.handleInvalidGrant(error, res)) return;
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

    const appointmentIds = new Set(suggestions.map((s) => s.messageId));
    for (const message of messages) {
      if (!appointmentIds.has(message.id)) {
        await GmailDB.setSuggestionStatus(message.id, 'dismissed');
      }
    }

    res.json({ count: suggestions.length, suggestions });
  });
}
