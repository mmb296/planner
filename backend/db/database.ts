import { createCalendarWatchTable } from './calendarWatchStore.js';
import { createCountdownTable } from './countdownStore.js';
import { createGmailTable } from './gmailStore.js';
import { createOauthTable } from './oauthStore.js';
import { createPeriodDaysTable } from './periodDaysStore.js';
import { createTaskTables } from './tasksStore.js';

// Initialize database with tables
export async function initDatabase() {
  try {
    await createTaskTables();
    await createGmailTable();
    await createOauthTable();
    await createCalendarWatchTable();
    await createCountdownTable();
    await createPeriodDaysTable();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
