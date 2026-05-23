import { dbGet, dbRun } from './connection.js';

/**
 * Stores the single Gmail push-watch registration for this account.
 *
 * Gmail's watch() API covers the whole inbox (unlike Calendar which is
 * per-calendarId), so we keep exactly one row (id = 1).
 *
 * Fields:
 *   history_id   – last historyId we've fully processed; used as the
 *                  starting point for gmail.users.history.list() when a
 *                  Pub/Sub notification arrives.
 *   expiration_ms – Unix-ms when the watch expires (max 7 days from
 *                   registration); we renew before this time.
 *   topic_name   – the Pub/Sub topic Gmail is publishing to, stored for
 *                  reference / debugging.
 */

export async function createGmailWatchTable(): Promise<void> {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS gmail_watch (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      history_id    TEXT,
      expiration_ms INTEGER,
      topic_name    TEXT,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Ensure the singleton row exists so UPDATE always finds a target.
  await dbRun(`INSERT INTO gmail_watch (id) VALUES (1) ON CONFLICT DO NOTHING`);
}

export type GmailWatchRow = {
  history_id: string | null;
  expiration_ms: number | null;
  topic_name: string | null;
};

export const GmailWatchDB = {
  async get(): Promise<GmailWatchRow | null> {
    const row = await dbGet<GmailWatchRow>(
      `SELECT history_id, expiration_ms, topic_name FROM gmail_watch WHERE id = 1`
    );
    if (!row) return null;
    return {
      ...row,
      expiration_ms:
        row.expiration_ms != null ? Number(row.expiration_ms) : null
    };
  },

  /** Overwrite watch registration metadata after a successful watch() call. */
  async save(params: {
    history_id: string;
    expiration_ms: number;
    topic_name: string;
  }): Promise<void> {
    await dbRun(
      `UPDATE gmail_watch
          SET history_id    = ?,
              expiration_ms = ?,
              topic_name    = ?,
              updated_at    = CURRENT_TIMESTAMP
        WHERE id = 1`,
      [params.history_id, params.expiration_ms, params.topic_name]
    );
  }
};
