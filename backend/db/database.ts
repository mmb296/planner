import { dbAll, dbGet, dbRun } from './connection.js';
import { createCountdownTable } from './countdownStore.js';
import { createGmailTable } from './gmailStore.js';
import { createOauthTable } from './oauthStore.js';
import { createTaskTables } from './tasksStore.js';

// Initialize database with tables
export async function initDatabase() {
  try {
    await createTaskTables();
    await createGmailTable();
    await createOauthTable();

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
