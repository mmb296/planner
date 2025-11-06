import express from 'express';
import { google } from 'googleapis';

import { OAuthTokenDB } from '../db/database.js';

export async function setupGoogleAuth(
  app: express.Express,
  port: string | number
) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${port}/auth/google/callback`
  );

  const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

  // Load token from database on startup
  const savedToken = await OAuthTokenDB.getToken();
  if (savedToken) {
    oauth2Client.setCredentials(savedToken);
    console.log('Loaded OAuth token from database');
  } else {
    console.log(
      'No OAuth token found in database. Visit /auth/google to authenticate.'
    );
  }

  // Listen for token refresh events and save them
  oauth2Client.on('tokens', async (token) => {
    // Get current token from DB to preserve refresh_token
    const currentToken = await OAuthTokenDB.getToken();
    OAuthTokenDB.saveToken({
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

  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query as { code?: string };
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Save token to database
    await OAuthTokenDB.saveToken(tokens);

    res.json({ message: 'Token saved successfully' });
  });

  return oauth2Client;
}
