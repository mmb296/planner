import express from 'express';
import { google } from 'googleapis';

import { OAuthIntegration, OAuthTokenDB } from '../db/database.js';

export async function setupGmailAuth(
  app: express.Express,
  port: string | number
) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${port}/auth/google/gmail/callback`
  );

  const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

  // Load token from database on startup
  const savedToken = await OAuthTokenDB.getToken(OAuthIntegration.Gmail);
  if (savedToken) {
    oauth2Client.setCredentials(savedToken);
    console.log('Loaded Gmail OAuth token from database');
  } else {
    console.log(
      'No OAuth token found in database. Visit /auth/google to authenticate.'
    );
  }

  // Listen for token refresh events and save them
  oauth2Client.on('tokens', async (token) => {
    // Get current token from DB to preserve refresh_token
    const currentToken = await OAuthTokenDB.getToken(OAuthIntegration.Gmail);
    OAuthTokenDB.saveToken(OAuthIntegration.Gmail, {
      ...currentToken,
      ...token,
      // Preserve refresh_token if new token don't include it
      refresh_token: token.refresh_token || currentToken?.refresh_token
    });
  });

  app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent screen to get refresh token
    });
    res.redirect(url);
  });

  app.get('/auth/google/gmail/callback', async (req, res) => {
    const { code } = req.query as { code?: string };
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Save token to database
    await OAuthTokenDB.saveToken(OAuthIntegration.Gmail, tokens);

    res.json({ message: 'Token saved successfully' });
  });

  return oauth2Client;
}
