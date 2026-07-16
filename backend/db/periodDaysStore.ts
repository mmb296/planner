import { dbAll, dbGet, dbRun } from './connection.js';

export async function createPeriodDaysTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS period_days (
      date DATE PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export const PeriodDaysDB = {
  async toggle(date: string): Promise<{ isPeriod: boolean }> {
    const existing = await dbGet<{ date: string }>(
      'SELECT date FROM period_days WHERE date = ?',
      [date]
    );

    if (existing) {
      await dbRun('DELETE FROM period_days WHERE date = ?', [date]);
      return { isPeriod: false };
    } else {
      await dbRun('INSERT INTO period_days (date) VALUES (?)', [date]);
      return { isPeriod: true };
    }
  },

  async getByDateRange(startDate: string, endDate?: string): Promise<string[]> {
    const actualEndDate = endDate || new Date().toISOString().split('T')[0];
    const rows = await dbAll<{ date: string }>(
      'SELECT date FROM period_days WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, actualEndDate]
    );
    return rows.map((row) => row.date);
  },

  async getAll(): Promise<string[]> {
    const rows = await dbAll<{ date: string }>(
      'SELECT date FROM period_days ORDER BY date'
    );
    return rows.map((row) => row.date);
  }
};
