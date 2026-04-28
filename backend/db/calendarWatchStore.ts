import { dbAll, dbGet, dbRun } from './connection.js';

export async function createCalendarWatchTable() {
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
}

export type CalendarWatchRow = {
  calendar_id: string;
  channel_id: string | null;
  channel_token: string | null;
  resource_id: string | null;
  expiration_ms: number | null;
  sync_token: string | null;
};

function parseCalendarWatchRow(row: CalendarWatchRow): CalendarWatchRow {
  return {
    ...row,
    expiration_ms: row.expiration_ms != null ? Number(row.expiration_ms) : null
  } as CalendarWatchRow;
}

export const CalendarWatchDB = {
  async getByCalendarId(calendarId: string): Promise<CalendarWatchRow | null> {
    const row = await dbGet<CalendarWatchRow>(
      'SELECT * FROM calendar_watch WHERE calendar_id = ?',
      [calendarId]
    );
    if (!row) return null;
    return parseCalendarWatchRow(row);
  },

  async getByChannelId(channelId: string): Promise<CalendarWatchRow | null> {
    const row = await dbGet<CalendarWatchRow>(
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

  async getAll(): Promise<CalendarWatchRow[]> {
    const rows = await dbAll<CalendarWatchRow>('SELECT * FROM calendar_watch');
    return rows.map(parseCalendarWatchRow);
  },

  async clear(calendarId: string): Promise<void> {
    await dbRun('DELETE FROM calendar_watch WHERE calendar_id = ?', [
      calendarId
    ]);
  },

  async clearAll(): Promise<void> {
    await dbRun('DELETE FROM calendar_watch');
  }
};
