import { createCalendarWatchTable } from './calendarWatchStore.js';
import { createGmailTable } from './gmailStore.js';
import { createGmailWatchTable } from './gmailWatchStore.js';
import { createOauthTable } from './oauthStore.js';
import { createTaskTables } from './tasksStore.js';

// Initialize database with tables
export async function initDatabase() {
  try {
    await createTaskTables();
    await createGmailTable();
    await createGmailWatchTable();
    await createOauthTable();
    await createCalendarWatchTable();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
