import { createCalendarWatchTable } from './calendarWatchStore.js';
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
    await createCalendarWatchTable();
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
