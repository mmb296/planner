import dotenv from 'dotenv';
import express from 'express';

import { registerCalendarSseRoute } from './calendarSse.js';
import {
  registerCalendarWebhookRoute,
  renewExpiringCalendarWatches
} from './calendarWatch.js';
import { setupGmailAuth, setupGoogleCalendarAuth } from './googleAuth.js';
import { applyMiddleware } from './middleware.js';
import { registerGmailRoutes, runGmailPipeline } from './routes/gmail.js';
import { registerGoogleCalendarRoutes } from './routes/googleCalendar.js';
import { registerPeriodDaysRoutes } from './routes/periodDays.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerTaskRoutes } from './routes/tasks.js';

dotenv.config();

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

export async function initializeApp(port: string | number) {
  const gmailOAuth2Client = await setupGmailAuth(app, port);
  const calendarOAuth2Client = await setupGoogleCalendarAuth(app, port);
  registerGmailRoutes(app, gmailOAuth2Client);
  void runGmailPipeline(gmailOAuth2Client).catch((e) =>
    console.warn('[gmail pipeline] startup failed:', e)
  );
  registerGoogleCalendarRoutes(app, calendarOAuth2Client);
  registerCalendarSseRoute(app);
  registerCalendarWebhookRoute(app, calendarOAuth2Client);
  void renewExpiringCalendarWatches(calendarOAuth2Client).catch((e) =>
    console.warn('[calendar watch] startup renew failed:', e)
  );
}
