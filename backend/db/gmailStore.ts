import { dbAll, dbGet, dbRun } from './connection.js';

export async function createGmailTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS gmail_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT,
      subject TEXT,
      from_address TEXT,
      snippet TEXT,
      internal_date_ms INTEGER,
      body_text TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_gmail_messages_internal_date
    ON gmail_messages (internal_date_ms)
  `);

  try {
    await dbRun(`ALTER TABLE gmail_messages ADD COLUMN suggestion_status TEXT`);
  } catch {
    /* column already exists */
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS gmail_sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_sync_at_ms INTEGER NOT NULL DEFAULT 0
    )
  `);
  await dbRun(
    `INSERT INTO gmail_sync_state (id, last_sync_at_ms) VALUES (1, 0) ON CONFLICT DO NOTHING`
  );
}

export type SuggestionStatus = 'accepted' | 'dismissed';

export type GmailMessageRow = {
  id: string;
  thread_id: string | null;
  subject: string | null;
  from_address: string | null;
  snippet: string | null;
  internal_date_ms: number | null;
  body_text: string | null;
  suggestion_status: SuggestionStatus | null;
};

export type AppointmentSuggestion = {
  messageId: string;
  subject: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
};

export const GmailDB = {
  async upsertMessage(message: {
    id: string;
    thread_id?: string;
    subject?: string;
    from_address?: string;
    snippet?: string;
    internal_date_ms?: number;
    body_text?: string;
  }) {
    await dbRun(
      `INSERT INTO gmail_messages (id, thread_id, subject, from_address, snippet, internal_date_ms, body_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           thread_id=excluded.thread_id,
           subject=excluded.subject,
           from_address=excluded.from_address,
           snippet=excluded.snippet,
           internal_date_ms=excluded.internal_date_ms,
           body_text=excluded.body_text`,
      [
        message.id,
        message.thread_id || null,
        message.subject || null,
        message.from_address || null,
        message.snippet || null,
        message.internal_date_ms || null,
        message.body_text || null
      ]
    );
  },

  async getMaxInternalDateMs(): Promise<number> {
    const row = await dbGet<{ maxVal: number }>(
      `SELECT COALESCE(MAX(internal_date_ms), 0) AS maxVal FROM gmail_messages`
    );
    return Number(row?.maxVal || 0);
  },

  async getLastSyncAt(): Promise<number> {
    const row = await dbGet<{ last_sync_at_ms: number }>(
      `SELECT last_sync_at_ms FROM gmail_sync_state WHERE id = 1`
    );
    return Number(row?.last_sync_at_ms || 0);
  },

  async setLastSyncAt(ms: number): Promise<void> {
    await dbRun(
      `UPDATE gmail_sync_state SET last_sync_at_ms = ? WHERE id = 1`,
      [ms]
    );
  },

  async getUnactionedMessages(): Promise<GmailMessageRow[]> {
    return dbAll<GmailMessageRow>(
      `SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text, suggestion_status
         FROM gmail_messages
         WHERE suggestion_status IS NULL
           AND body_text IS NOT NULL AND body_text <> ''
           AND subject IS NOT NULL AND from_address IS NOT NULL
         ORDER BY internal_date_ms DESC`
    );
  },

  async getMessageById(id: string): Promise<GmailMessageRow | null> {
    const row = await dbGet<GmailMessageRow>(
      `SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text, suggestion_status
         FROM gmail_messages WHERE id = ?`,
      [id]
    );
    return row ?? null;
  },

  async setSuggestionStatus(
    id: string,
    status: SuggestionStatus
  ): Promise<void> {
    await dbRun(
      `UPDATE gmail_messages SET suggestion_status = ? WHERE id = ?`,
      [status, id]
    );
  }
};
