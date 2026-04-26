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
    const existing = await dbGet(
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
    const actualEndDate = endDate || new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const rows = (await dbAll(
      'SELECT date FROM period_days WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, actualEndDate]
    )) as any[];
    return rows.map((row) => row.date);
  },

  async getAll(): Promise<string[]> {
    const rows = (await dbAll(
      'SELECT date FROM period_days ORDER BY date'
    )) as any[];
    return rows.map((row) => row.date);
  }
};
