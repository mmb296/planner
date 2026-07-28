import { createCalendarWatchTable } from '@/lib/db/calendarWatchStore';
import { createGmailTable } from '@/lib/db/gmailStore';
import { createGmailWatchTable } from '@/lib/db/gmailWatchStore';
import { createOauthTable } from '@/lib/db/oauthStore';

// Initialize database with tables
export async function initDatabase() {
  try {
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
