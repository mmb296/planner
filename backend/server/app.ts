import dotenv from 'dotenv';
import express from 'express';

import { registerCalendarSseRoute } from './calendarSse.js';
import {
  registerCalendarWebhookRoute,
  renewCalendarWatchIfNeeded
} from './calendarWatch.js';
import { setupGmailAuth, setupGoogleCalendarAuth } from './googleAuth.js';
import { applyMiddleware } from './middleware.js';
import { registerGmailRoutes } from './routes/gmail.js';
import { registerGoogleCalendarRoutes } from './routes/googleCalendar.js';
import { registerPeriodDaysRoutes } from './routes/periodDays.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerTaskRoutes } from './routes/tasks.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

export const app = express();

// Middleware
applyMiddleware(app);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Planner API is running!' });
});

// Register routes that don't depend on auth
registerTaskRoutes(app);
registerPeriodDaysRoutes(app);
registerSettingsRoutes(app);

export async function initializeApp() {
  const gmailOAuth2Client = await setupGmailAuth(app, PORT);
  const calendarOAuth2Client = await setupGoogleCalendarAuth(app, PORT);
  registerGmailRoutes(app, gmailOAuth2Client);
  registerGoogleCalendarRoutes(app, calendarOAuth2Client);
  registerCalendarSseRoute(app);
  registerCalendarWebhookRoute(app, calendarOAuth2Client);
  void renewCalendarWatchIfNeeded(calendarOAuth2Client).catch((e) =>
    console.warn('[calendar watch] startup renew failed:', e)
  );
}
