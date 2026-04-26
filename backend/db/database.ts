import { dbAll, dbGet, dbRun } from './connection.js';
import { createCountdownTable } from './countdownStore.js';
import { createTaskTables } from './tasksStore.js';

export enum OAuthIntegration {
  Gmail = 'gmail',
  Calendar = 'calendar'
}

export type OAuthToken = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

export type OAuthTokenInput = {
  [K in keyof OAuthToken]?: OAuthToken[K] | null;
} & {
  // Google may send array; DB stores string
  scope?: string | string[] | null;
};

// Initialize database with tables
export async function initDatabase() {
  try {
    await createTaskTables();

    // Create gmail_messages table
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

    // Index to speed up MAX(internal_date_ms)
    await dbRun(`
      CREATE INDEX IF NOT EXISTS idx_gmail_messages_internal_date
      ON gmail_messages (internal_date_ms)
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        integration TEXT PRIMARY KEY CHECK (integration IN ('gmail', 'calendar')),
        access_token TEXT,
        refresh_token TEXT,
        scope TEXT,
        token_type TEXT,
        expiry_date INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS calendar_watch (
        calendar_id TEXT PRIMARY KEY,
        channel_id TEXT,
        channel_token TEXT,
        resource_id TEXT,
        expiration_ms INTEGER,
        sync_token TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createCountdownTable();

    // Create period_days table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS period_days (
        date DATE PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Gmail operations
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
    const row: any = await dbGet(
      `SELECT COALESCE(MAX(internal_date_ms), 0) AS maxVal FROM gmail_messages`
    );
    return Number(row?.maxVal || 0);
  },

  async getMessagesWithBody(limit?: number): Promise<any[]> {
    const query = `
      SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text
      FROM gmail_messages
      WHERE body_text IS NOT NULL AND body_text <> ''
      ORDER BY internal_date_ms DESC
      ${limit ? 'LIMIT ?' : ''}
    `;

    const params = limit ? [limit] : [];
    const rows = await dbAll(query, params);
    return rows as any[];
  },

  async getMessageById(id: string): Promise<any | null> {
    const row = await dbGet(
      `SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text
       FROM gmail_messages
       WHERE id = ?`,
      [id]
    );
    return row || null;
  }
};

// Google OAuth tokens: one row per integration (Gmail, Calendar)
export const OAuthTokenDB = {
  async saveToken(integration: OAuthIntegration, tokens: OAuthTokenInput) {
    const scope = Array.isArray(tokens.scope)
      ? tokens.scope.join(' ')
      : tokens.scope || null;

    await dbRun(
      `INSERT INTO oauth_tokens (integration, access_token, refresh_token, scope, token_type, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(integration) DO UPDATE SET
         access_token=excluded.access_token,
         refresh_token=COALESCE(excluded.refresh_token, oauth_tokens.refresh_token),
         scope=excluded.scope,
         token_type=excluded.token_type,
         expiry_date=excluded.expiry_date,
         updated_at=CURRENT_TIMESTAMP`,
      [
        integration,
        tokens.access_token || null,
        tokens.refresh_token || null,
        scope,
        tokens.token_type || null,
        tokens.expiry_date || null
      ]
    );
  },

  async getToken(integration: OAuthIntegration): Promise<OAuthToken | null> {
    const row: any = await dbGet(
      'SELECT * FROM oauth_tokens WHERE integration = ?',
      [integration]
    );
    if (!row) return null;

    return {
      access_token: row.access_token || undefined,
      refresh_token: row.refresh_token || undefined,
      scope: row.scope || undefined,
      token_type: row.token_type || undefined,
      expiry_date: row.expiry_date || undefined
    };
  },

  async clearToken(integration: OAuthIntegration): Promise<void> {
    await dbRun('DELETE FROM oauth_tokens WHERE integration = ?', [
      integration
    ]);
  }
};

export type CalendarWatchRow = {
  calendar_id: string;
  channel_id: string | null;
  channel_token: string | null;
  resource_id: string | null;
  expiration_ms: number | null;
  sync_token: string | null;
};

function parseCalendarWatchRow(row: any): CalendarWatchRow {
  return {
    ...row,
    expiration_ms: row.expiration_ms != null ? Number(row.expiration_ms) : null
  } as CalendarWatchRow;
}

export const CalendarWatchDB = {
  async getByCalendarId(calendarId: string): Promise<CalendarWatchRow | null> {
    const row: any = await dbGet(
      'SELECT * FROM calendar_watch WHERE calendar_id = ?',
      [calendarId]
    );
    if (!row) return null;
    return parseCalendarWatchRow(row);
  },

  async getByChannelId(channelId: string): Promise<CalendarWatchRow | null> {
    const row: any = await dbGet(
      'SELECT * FROM calendar_watch WHERE channel_id = ?',
      [channelId]
    );
    if (!row) return null;
    return parseCalendarWatchRow(row);
  },

  async save(row: {
    calendar_id: string;
    channel_id: string;
    resource_id: string;
    expiration_ms: number;
    sync_token?: string | null;
    channel_token: string;
  }): Promise<void> {
    await dbRun(
      `INSERT INTO calendar_watch (calendar_id, channel_id, resource_id, expiration_ms, sync_token, channel_token)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(calendar_id) DO UPDATE SET
         channel_id=excluded.channel_id,
         resource_id=excluded.resource_id,
         expiration_ms=excluded.expiration_ms,
         sync_token=COALESCE(excluded.sync_token, calendar_watch.sync_token),
         channel_token=excluded.channel_token,
         updated_at=CURRENT_TIMESTAMP`,
      [
        row.calendar_id,
        row.channel_id,
        row.resource_id,
        row.expiration_ms,
        row.sync_token ?? null,
        row.channel_token
      ]
    );
  },

  async updateSyncToken(
    calendarId: string,
    syncToken: string | null
  ): Promise<void> {
    await dbRun(
      `UPDATE calendar_watch SET sync_token = ?, updated_at = CURRENT_TIMESTAMP WHERE calendar_id = ?`,
      [syncToken, calendarId]
    );
  },

  async clear(calendarId: string): Promise<void> {
    await dbRun('DELETE FROM calendar_watch WHERE calendar_id = ?', [
      calendarId
    ]);
  }
};

// Period Days operations
export const PeriodDaysDB = {
  // Toggle period day (add if doesn't exist, remove if exists)
  async toggle(date: string): Promise<{ isPeriod: boolean }> {
    // Check if date exists
    const existing = await dbGet(
      'SELECT date FROM period_days WHERE date = ?',
      [date]
    );

    if (existing) {
      // Remove it
      await dbRun('DELETE FROM period_days WHERE date = ?', [date]);
      return { isPeriod: false };
    } else {
      // Add it
      await dbRun('INSERT INTO period_days (date) VALUES (?)', [date]);
      return { isPeriod: true };
    }
  },

  // Get period days for a date range
  async getByDateRange(startDate: string, endDate?: string): Promise<string[]> {
    // If endDate is not provided, use today's date
    const actualEndDate = endDate || new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const rows = (await dbAll(
      'SELECT date FROM period_days WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, actualEndDate]
    )) as any[];
    return rows.map((row) => row.date);
  },

  // Get all period days (for prediction calculation)
  async getAll(): Promise<string[]> {
    const rows = (await dbAll(
      'SELECT date FROM period_days ORDER BY date'
    )) as any[];
    return rows.map((row) => row.date);
  }
};
