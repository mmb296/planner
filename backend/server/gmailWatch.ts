import { GmailWatchDB } from '../db/gmailWatchStore.js';
import { GmailOAuthSession } from './googleOAuthSession.js';

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
