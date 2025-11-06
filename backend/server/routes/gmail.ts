import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';
import OpenAI from 'openai';

import { GmailDB } from '../../db/database.js';

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

async function extractAppointmentDetails(
  subject: string | undefined,
  from: string | undefined,
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
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an assistant that extracts appointment or meeting information from emails.
Analyze the entire email and return a JSON object with the following keys:
- isAppointment: boolean (true only if this email clearly references a scheduled appointment, meeting, visit, or service)
- title: string (concise, descriptive label that mentions the specific appointment purpose or provider; avoid generic titles like "Appointment Reminder")
- date: string (ISO format YYYY-MM-DD, or null if not found)
- time: string (HH:MM format using 24-hour clock, or null if not found)
- location: string (physical address or virtual meeting link/details, or null if not found)
- description: string (one-sentence summary including key details such as provider, service type, preparation instructions, etc., or null if not found)

If the email references multiple appointments, focus on the primary one. If isAppointment is false, set all other fields to null.
Only include information explicitly mentioned or inferable with high confidence from the email.`
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

          // Extract appointment details using AI
          if (bodyText && process.env.OPENAI_API_KEY) {
            const appointmentDetails = await extractAppointmentDetails(
              subject,
              from,
              bodyText
            );
            if (appointmentDetails) {
              console.log('Found appointment:', appointmentDetails);
            }
          }
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
