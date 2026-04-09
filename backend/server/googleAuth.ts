import express from 'express';
import { google } from 'googleapis';

import { OAuthIntegration, OAuthTokenDB } from '../db/database.js';

type GoogleOAuthOptions = {
  integration: OAuthIntegration;
  scopes: string[];
  /** If set, browser is sent here after tokens are saved; otherwise JSON success */
  returnToApp?: Boolean;
};

/** Display name for logs/errors; enum values are lowercase path segments (gmail → Gmail) */
function googleOAuthIntegrationLabel(integration: OAuthIntegration): string {
  const s = integration as string;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function googleOAuthPaths(integration: OAuthIntegration) {
  const base = `/auth/google/${integration}`;
  return { authPath: base, callbackPath: `${base}/callback` };
}

async function setupGoogleOAuthFlow(
  app: express.Express,
  port: string | number,
  options: GoogleOAuthOptions
) {
  const { integration, scopes, returnToApp } = options;
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

  app.get(authPath, (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
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

      if (returnToApp) {
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

export async function setupGmailAuth(
  app: express.Express,
  port: string | number
) {
  return setupGoogleOAuthFlow(app, port, {
    integration: OAuthIntegration.Gmail,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly']
  });
}

export async function setupGoogleCalendarAuth(
  app: express.Express,
  port: string | number
) {
  return setupGoogleOAuthFlow(app, port, {
    integration: OAuthIntegration.Calendar,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    returnToApp: true
  });
}
