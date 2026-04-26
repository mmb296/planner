import express from 'express';
import { google } from 'googleapis';

import { OAuthIntegration, OAuthTokenDB } from '../db/oauthStore.js';
import { registerPrimaryCalendarWatch } from './calendarWatch.js';

const GOOGLE_INTEGRATION_SCOPES: Record<OAuthIntegration, string[]> = {
  gmail: ['https://www.googleapis.com/auth/gmail.readonly'],
  calendar: ['https://www.googleapis.com/auth/calendar.readonly']
};

function googleOAuthIntegrationLabel(integration: OAuthIntegration): string {
  return integration.charAt(0).toUpperCase() + integration.slice(1);
}

function googleOAuthPaths(integration: OAuthIntegration) {
  const base = `/auth/google/${integration}`;
  return { authPath: base, callbackPath: `${base}/callback` };
}

async function setupGoogleOAuthFlow(
  app: express.Express,
  port: string | number,
  integration: OAuthIntegration
) {
  const { authPath, callbackPath } = googleOAuthPaths(integration);
  const label = googleOAuthIntegrationLabel(integration);

  const callbackUri = `http://localhost:${port}${callbackPath}`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUri
  );

  const saved = await OAuthTokenDB.getToken(integration);
  if (saved) {
    oauth2Client.setCredentials(saved);
    console.log(`Loaded ${label} OAuth token from database`);
  } else {
    console.log(`No ${label} OAuth token. Visit ${authPath} to authenticate.`);
  }

  oauth2Client.on('tokens', async (token) => {
    const current = await OAuthTokenDB.getToken(integration);
    await OAuthTokenDB.saveToken(integration, {
      ...current,
      ...token,
      refresh_token: token.refresh_token || current?.refresh_token
    });
  });

  app.get(authPath, async (req, res) => {
    const existing = await OAuthTokenDB.getToken(integration);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_INTEGRATION_SCOPES[integration],
      // Only force consent (and a new refresh token) when we don't already have one.
      // Using 'consent' when a refresh token exists revokes the old one, which
      // invalidates any other stored sessions.
      prompt: existing?.refresh_token ? 'select_account' : 'consent'
    });
    res.redirect(url);
  });

  app.get(callbackPath, async (req, res) => {
    try {
      const { code } = req.query as { code?: string };
      if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
      }
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      await OAuthTokenDB.saveToken(integration, tokens);

      if (integration === 'calendar') {
        void registerPrimaryCalendarWatch(oauth2Client).catch((e) =>
          console.warn('[calendar watch] register after OAuth failed:', e)
        );
        res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
      } else {
        res.json({ message: 'Token saved successfully' });
      }
    } catch (error) {
      console.error(`${label} OAuth callback error:`, error);
      res.status(500).json({ error: `${label} authentication failed` });
    }
  });

  return oauth2Client;
}

export function setupGmailAuth(app: express.Express, port: string | number) {
  return setupGoogleOAuthFlow(app, port, 'gmail');
}

export function setupGoogleCalendarAuth(
  app: express.Express,
  port: string | number
) {
  return setupGoogleOAuthFlow(app, port, 'calendar');
}
