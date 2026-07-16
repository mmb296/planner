import dotenv from 'dotenv';
import express from 'express';

import { registerCalendarSseRoute } from './calendarSse.js';
import { registerGmailSseRoute } from './gmailSse.js';
import {
  registerCalendarWebhookRoute,
  renewExpiringCalendarWatches
} from './calendarWatch.js';
import {
  registerGmailWebhookRoute,
  renewExpiringGmailWatch
} from './gmailWatch.js';
import { setupGmailAuth, setupGoogleCalendarAuth } from './googleAuth.js';
import { applyMiddleware } from './middleware.js';
import { registerGmailRoutes, syncGmailMessages } from './routes/gmail.js';
import { registerGoogleCalendarRoutes } from './routes/googleCalendar.js';

dotenv.config();

export const app = express();

// Middleware
applyMiddleware(app);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Planner API is running!' });
});

export async function initializeApp(port: string | number) {
  const gmailSession = await setupGmailAuth(app, port);
  const calendarSession = await setupGoogleCalendarAuth(app, port);
  registerGmailRoutes(app, gmailSession, calendarSession);
  const gmail = gmailSession.getGmailClient();
  if (gmail) {
    void syncGmailMessages(gmail)
      .then((synced) => {
        console.log(`[gmail pipeline] synced ${synced} new messages`);
      })
      .catch(async (e) => {
        if (await gmailSession.clearIfInvalidGrant(e))
          console.warn('[gmail pipeline] Gmail OAuth invalid — skipping sync');
        else console.error('[gmail pipeline] sync error:', e);
      });
  }
  void renewExpiringGmailWatch(gmailSession).catch(async (e) => {
    if (await gmailSession.clearIfInvalidGrant(e))
      console.warn(
        '[gmail watch] Gmail OAuth invalid — skipping watch renewal'
      );
    else console.error('[gmail watch] startup renew failed:', e);
  });
  registerGmailWebhookRoute(app, gmailSession);
  registerGmailSseRoute(app);
  registerGoogleCalendarRoutes(app, calendarSession);
  registerCalendarSseRoute(app);
  registerCalendarWebhookRoute(app, calendarSession);
  void renewExpiringCalendarWatches(calendarSession).catch(async (e) => {
    if (await calendarSession.clearIfInvalidGrant(e))
      console.warn(
        '[calendar watch] Calendar OAuth invalid — skipping watch renewal'
      );
    else console.error('[calendar watch] startup renew failed:', e);
  });
}
