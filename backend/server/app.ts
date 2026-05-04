import dotenv from 'dotenv';
import express from 'express';

import { registerCalendarSseRoute } from './calendarSse.js';
import {
  registerCalendarWebhookRoute,
  renewExpiringCalendarWatches
} from './calendarWatch.js';
import { setupGmailAuth, setupGoogleCalendarAuth } from './googleAuth.js';
import { isInvalidGrant } from './googleOAuthSession.js';
import { applyMiddleware } from './middleware.js';
import { registerGmailRoutes, syncGmailMessages } from './routes/gmail.js';
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
  const gmailSession = await setupGmailAuth(app, port);
  const calendarSession = await setupGoogleCalendarAuth(app, port);
  registerGmailRoutes(app, gmailSession);
  const gmail = gmailSession.getGmailClient();
  if (gmail) {
    void syncGmailMessages(gmail)
      .then((synced) => {
        console.log(`[gmail pipeline] synced ${synced} new messages`);
      })
      .catch((e) => {
        if (isInvalidGrant(e)) {
          void gmailSession.clearSession();
          console.warn('[gmail pipeline] Gmail OAuth invalid — skipping sync');
        } else {
          console.error('[gmail pipeline] sync error:', e);
        }
      });
  }
  registerGoogleCalendarRoutes(app, calendarSession);
  registerCalendarSseRoute(app);
  registerCalendarWebhookRoute(app, calendarSession);
  void renewExpiringCalendarWatches(calendarSession).catch((e) => {
    if (isInvalidGrant(e)) {
      void calendarSession.clearSession();
      console.warn(
        '[calendar watch] Calendar OAuth invalid — skipping watch renewal'
      );
    } else {
      console.error('[calendar watch] startup renew failed:', e);
    }
  });
}
