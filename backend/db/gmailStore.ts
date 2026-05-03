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
}

export type GmailMessageRow = {
  id: string;
  thread_id: string | null;
  subject: string | null;
  from_address: string | null;
  snippet: string | null;
  internal_date_ms: number | null;
  body_text: string | null;
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

  async getMessagesWithBody(limit?: number): Promise<GmailMessageRow[]> {
    const query = `
      SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text
      FROM gmail_messages
      WHERE body_text IS NOT NULL AND body_text <> ''
      AND subject IS NOT NULL AND from_address IS NOT NULL
      ORDER BY internal_date_ms DESC
      ${limit ? 'LIMIT ?' : ''}
    `;
    return dbAll<GmailMessageRow>(query, limit ? [limit] : []);
  },

  async getMessageById(id: string): Promise<GmailMessageRow | null> {
    const row = await dbGet<GmailMessageRow>(
      `SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text
         FROM gmail_messages
         WHERE id = ?`,
      [id]
    );
    return row ?? null;
  }
};
