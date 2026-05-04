import dotenv from 'dotenv';
import express from 'express';

import { registerCalendarSseRoute } from './calendarSse.js';
import {
  registerCalendarWebhookRoute,
  renewExpiringCalendarWatches
} from './calendarWatch.js';
import { setupGmailAuth, setupGoogleCalendarAuth } from './googleAuth.js';
import {
  clearCalendarOAuthSession,
  clearGmailOAuthSession,
  isInvalidGrant
} from './googleOAuthInvalidGrant.js';
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
  const gmailOAuth2Client = await setupGmailAuth(app, port);
  const calendarOAuth2Client = await setupGoogleCalendarAuth(app, port);
  registerGmailRoutes(app, gmailOAuth2Client);
  void syncGmailMessages(gmailOAuth2Client)
    .then((synced) => {
      console.log(`[gmail pipeline] synced ${synced} new messages`);
    })
    .catch((e) => {
      if (isInvalidGrant(e)) {
        void clearGmailOAuthSession(gmailOAuth2Client);
        console.warn('[gmail pipeline] Gmail OAuth invalid — skipping sync');
      } else {
        console.error('[gmail pipeline] sync error:', e);
      }
    });
  registerGoogleCalendarRoutes(app, calendarOAuth2Client);
  registerCalendarSseRoute(app);
  registerCalendarWebhookRoute(app, calendarOAuth2Client);
  void renewExpiringCalendarWatches(calendarOAuth2Client).catch((e) => {
    if (isInvalidGrant(e)) {
      void clearCalendarOAuthSession(calendarOAuth2Client);
      console.warn(
        '[calendar watch] Calendar OAuth invalid — skipping watch renewal'
      );
    } else {
      console.error('[calendar watch] startup renew failed:', e);
    }
  });
}
