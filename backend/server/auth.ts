import express from 'express';
import { google } from 'googleapis';

export function setupGoogleAuth(app: express.Express, port: string | number) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${port}/auth/google/callback`
  );

  const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

  app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    res.redirect(url);
  });

  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query as { code?: string };
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    res.json(tokens);
  });

  return oauth2Client;
}
