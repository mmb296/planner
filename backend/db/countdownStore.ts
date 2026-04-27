import { dbGet, dbRun } from './connection.js';

export async function createCountdownTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS countdown_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      target_date TEXT NOT NULL,
      title TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

type CountdownRow = { target_date: string; title: string | null };

export const CountdownConfigDB = {
  async get(): Promise<{ target_date: string; title?: string } | null> {
    const row = await dbGet<CountdownRow>(
      'SELECT target_date, title FROM countdown_config WHERE id = 1'
    );
    if (!row) return null;
    return {
      target_date: row.target_date,
      title: row.title || undefined
    };
  },

  async set(targetDate: string, title?: string): Promise<void> {
    await dbRun(
      `INSERT INTO countdown_config (id, target_date, title)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         target_date=excluded.target_date,
         title=excluded.title,
         updated_at=CURRENT_TIMESTAMP`,
      [targetDate, title || null]
    );
  }
};
