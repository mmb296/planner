import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';

import { registerGmailRoutes } from './routes/gmail.js';
import { registerTaskRoutes } from './routes/tasks.js';

dotenv.config();

export const app = express();

// Middleware
app.use(express.json());

// CORS middleware (for frontend communication)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Planner API is running!' });
});

// Google OAuth setup
const PORT = process.env.PORT || 5000;
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${PORT}/auth/google/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Google Auth routes
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

// Register routes
registerGmailRoutes(app, oauth2Client);
registerTaskRoutes(app);
