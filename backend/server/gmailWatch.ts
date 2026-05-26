import type { Express, Request, Response } from 'express';

import { GmailDB } from '../db/gmailStore.js';
import { GmailWatchDB } from '../db/gmailWatchStore.js';
import { GmailOAuthSession } from './googleOAuthSession.js';
import { extractDetails, isAppointmentRelated } from './routes/gmail.js';

import type { gmail_v1 } from 'googleapis';

const WATCH_RENEW_BUFFER_MS = 24 * 60 * 60 * 1000; // renew if <24 h left

/**
 * Calls gmail.users.watch() and persists the returned historyId + expiration.
 * Safe to call repeatedly — each call replaces the previous registration.
 */
export async function registerGmailWatch(gmail: gmail_v1.Gmail): Promise<void> {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC?.trim() || undefined;
  if (!topicName) {
    console.log(
      '[gmail watch] Skipped: set GMAIL_PUBSUB_TOPIC to enable push notifications.\n' +
        '              See backend/server/gmailWatch.ts for setup instructions.'
    );
    return;
  }

  const resp = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE'
    }
  });

  const { historyId, expiration } = resp.data;
  if (!historyId || !expiration) {
    throw new Error(
      `[gmail watch] watch() response missing historyId or expiration: ${JSON.stringify(resp.data)}`
    );
  }

  const expirationMs =
    typeof expiration === 'string'
      ? parseInt(expiration, 10)
      : Number(expiration);

  await GmailWatchDB.save({
    history_id: historyId,
    expiration_ms: expirationMs,
    topic_name: topicName
  });

  console.log(
    `[gmail watch] Watch active; historyId=${historyId} ` +
      `expires=${new Date(expirationMs).toISOString()}`
  );
}

/**
 * Renew the watch if it is absent or expires within the next 24 hours.
 * Call this at server startup and once per day.
 */
export async function renewExpiringGmailWatch(
  session: GmailOAuthSession
): Promise<void> {
  if (!process.env.GMAIL_PUBSUB_TOPIC?.trim()) return; // env var not set, nothing to do

  const gmail = session.getGmailClient();
  if (!gmail) return; // not authenticated yet

  const row = await GmailWatchDB.get();
  const now = Date.now();
  const exp = row?.expiration_ms ?? 0;

  if (row?.history_id && exp - WATCH_RENEW_BUFFER_MS > now) {
    console.log(
      `[gmail watch] Watch still valid until ${new Date(exp).toISOString()}, skipping renewal.`
    );
    return;
  }

  await registerGmailWatch(gmail);
}

/**
 * Fetches all history events since the last stored historyId, upserts any new
 * inbox messages, and advances the stored historyId.
 * Returns the number of new messages saved.
 */
export async function processGmailHistory(
  gmail: gmail_v1.Gmail
): Promise<number> {
  const row = await GmailWatchDB.get();
  if (!row?.history_id) {
    console.warn('[gmail watch] No stored historyId — skipping history fetch');
    return 0;
  }

  let savedCount = 0;
  let pageToken: string | undefined;
  let latestHistoryId: string | undefined;

  do {
    const resp = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: row.history_id,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
      maxResults: 100,
      pageToken
    });

    const { history = [], nextPageToken, historyId } = resp.data;
    if (historyId) latestHistoryId = historyId;

    for (const record of history) {
      for (const added of record.messagesAdded ?? []) {
        const msgId = added.message?.id;
        if (!msgId) continue;

        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msgId
        });
        const details = extractDetails(full.data);

        if (!isAppointmentRelated(details.subject)) continue;

        await GmailDB.upsertMessage({
          id: msgId,
          thread_id: details.threadId || undefined,
          subject: details.subject,
          from_address: details.from,
          snippet: details.snippet,
          internal_date_ms: details.internalDateMs,
          body_text: details.bodyText || undefined
        });
        savedCount++;
      }
    }

    pageToken = nextPageToken ?? undefined;
  } while (pageToken);

  if (latestHistoryId) {
    await GmailWatchDB.advanceHistoryId(latestHistoryId);
  }

  console.log(
    `[gmail watch] History processed; ${savedCount} new message(s) saved`
  );
  return savedCount;
}

export function registerGmailWebhookRoute(
  app: Express,
  session: GmailOAuthSession
): void {
  app.post('/api/gmail/webhook', (req: Request, res: Response) => {
    // Respond immediately — Pub/Sub retries if it doesn't get a 2xx quickly.
    res.status(200).end();

    const message = req.body?.message;
    if (!message?.data) return;

    let notification: { emailAddress?: string; historyId?: string };
    try {
      notification = JSON.parse(
        Buffer.from(message.data, 'base64').toString('utf-8')
      );
    } catch {
      console.error('[gmail watch] Failed to decode Pub/Sub payload');
      return;
    }

    console.log(
      `[gmail watch] Notification received; historyId=${notification.historyId}`
    );

    const gmail = session.getGmailClient();
    if (!gmail) return;

    setImmediate(() => {
      processGmailHistory(gmail).catch((e) =>
        console.error('[gmail watch] History processing failed:', e)
      );
    });
  });
}
