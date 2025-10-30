import dotenv from 'dotenv';
import express from 'express';

import { setupGoogleAuth } from './auth.js';
import { applyMiddleware } from './middleware.js';
import { registerGmailRoutes } from './routes/gmail.js';
import { registerTaskRoutes } from './routes/tasks.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

export const app = express();

// Middleware
applyMiddleware(app);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Planner API is running!' });
});

// Google OAuth setup
const oauth2Client = setupGoogleAuth(app, PORT);

// Register routes
registerGmailRoutes(app, oauth2Client);
registerTaskRoutes(app);
