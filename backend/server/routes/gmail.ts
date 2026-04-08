import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';
import OpenAI from 'openai';

import { GmailDB, OAuthIntegration } from '../../db/database.js';
import {
  clearGoogleOAuthSession,
  isInvalidGrant
} from '../googleOAuthInvalidGrant.js';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  // Extract body text
  let bodyText = '';
  if (payload?.payload) {
    const p = payload.payload;

    // Simple message with body
    if (p.body?.data) {
      bodyText = Buffer.from(p.body.data, 'base64').toString('utf-8');
    }
    // Multipart message
    else if (p.parts && Array.isArray(p.parts)) {
      const textParts: string[] = [];
      const htmlParts: string[] = [];

      function extractFromPart(part: any) {
        if (part.body?.data) {
          const decoded = Buffer.from(part.body.data, 'base64').toString(
            'utf-8'
          );
          const mimeType = part.mimeType?.toLowerCase() || '';

          if (mimeType === 'text/plain') {
            textParts.push(decoded);
          } else if (mimeType === 'text/html') {
            htmlParts.push(decoded);
          }
        }

        // Recursively check nested parts
        if (part.parts && Array.isArray(part.parts)) {
          part.parts.forEach(extractFromPart);
        }
      }

      p.parts.forEach(extractFromPart);

      // Prefer plain text over HTML
      if (textParts.length > 0) {
        bodyText = textParts.join('\n');
      } else if (htmlParts.length > 0) {
        bodyText = htmlParts.join('\n');
      }
    }
  }

  return { subject, from, internalDateMs, snippet, bodyText };
}

interface GmailMessage {
  id: string;
  thread_id?: string | null;
  subject?: string | null;
  from_address?: string | null;
  snippet?: string | null;
  internal_date_ms?: number | null;
  body_text?: string | null;
}

function hasRequiredFields(message: GmailMessage) {
  const subject = message.subject?.trim();
  const from = message.from_address?.trim();
  const body = message.body_text?.trim();
  return Boolean(subject && from && body);
}

async function extractAppointmentDetails(
  subject: string,
  from: string,
  bodyText: string
): Promise<{
  isAppointment: boolean;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
} | null> {
  if (!bodyText && !subject) return null;

  const emailContent = `Subject: ${subject || 'N/A'}\nFrom: ${from || 'N/A'}\n\n${bodyText}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are an assistant that extracts appointment information from emails. 
Return a JSON object with:
- isAppointment: boolean (true if this email contains an appointment/meeting/event)
- title: string (event title/summary)
- date: string (ISO format YYYY-MM-DD, or null if not found)
- time: string (HH:MM format using 24-hour clock, or null if not found)
- location: string (physical address or virtual meeting link/details, or null if not found)
- description: string (brief description, or null if not found)
If isAppointment is false, return null for all other fields.`
        },
        {
          role: 'user',
          content: emailContent
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return result.isAppointment ? result : null;
  } catch (error) {
    console.error('Error extracting appointment details:', error);
    return null;
  }
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

      const baseQuery =
        '"Ignite Physical Therapy & Sports Performance" "Appointment"';
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
      console.error('Gmail fetch error:', error);
      if (isInvalidGrant(error)) {
        await clearGoogleOAuthSession(oauth2Client, OAuthIntegration.Gmail);
        return res.status(401).json({
          error:
            'Gmail access expired or was revoked. Sign in with Google again.'
        });
      }
      res.status(500).json({ error: 'Failed to perform incremental fetch' });
    }
  });

  // AI appointment suggestion route
  app.get('/api/ai/appointments/suggestions', async (req, res) => {
    try {
      if (!openai) {
        return res
          .status(500)
          .json({ error: 'OpenAI API key not configured on the server' });
      }

      const limitParam = req.query.limit as string | undefined;
      const limit = limitParam ? Math.max(parseInt(limitParam, 10), 1) : 25;

      const messages: GmailMessage[] = await GmailDB.getMessagesWithBody(limit);
      const suggestions: Array<{
        isAppointment: boolean;
        title?: string;
        date?: string;
        time?: string;
        location?: string;
        description?: string;
      }> = [];

      for (const message of messages) {
        if (!hasRequiredFields(message)) {
          continue;
        }

        const suggestion = await extractAppointmentDetails(
          message.subject as string,
          message.from_address as string,
          message.body_text as string
        );

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      res.json({ count: suggestions.length, suggestions });
    } catch (error) {
      console.error('AI appointment suggestion error:', error);
      res
        .status(500)
        .json({ error: 'Failed to generate appointment suggestions' });
    }
  });

  // AI suggestion for a specific message
  app.get('/api/ai/appointments/suggestions/:messageId', async (req, res) => {
    try {
      if (!openai) {
        return res
          .status(500)
          .json({ error: 'OpenAI API key not configured on the server' });
      }

      const { messageId } = req.params;
      const message = (await GmailDB.getMessageById(
        messageId
      )) as GmailMessage | null;
      if (!message) {
        return res
          .status(404)
          .json({ error: `No stored Gmail message with id ${messageId}` });
      }

      if (!hasRequiredFields(message)) {
        return res.status(400).json({
          error: 'Stored message is missing subject, from address, or body text'
        });
      }

      const suggestion = await extractAppointmentDetails(
        message.subject as string,
        message.from_address as string,
        message.body_text as string
      );

      res.json({
        messageId,
        suggestion
      });
    } catch (error) {
      console.error('AI appointment suggestion (single) error:', error);
      res.status(500).json({
        error: 'Failed to generate appointment suggestion for the message'
      });
    }
  });
}
