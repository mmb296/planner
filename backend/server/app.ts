import dotenv from 'dotenv';
import express from 'express';

import { setupGoogleAuth } from './auth.js';
import { applyMiddleware } from './middleware.js';
import { registerGmailRoutes } from './routes/gmail.js';
import { registerGoalsRoutes } from './routes/goals.js';
import { registerPeriodDaysRoutes } from './routes/periodDays.js';
import { registerSettingsRoutes } from './routes/settings.js';
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

// Register routes that don't depend on auth
registerTaskRoutes(app);
registerPeriodDaysRoutes(app);
registerSettingsRoutes(app);
registerGoalsRoutes(app);

export async function initializeApp() {
  const oauth2Client = await setupGoogleAuth(app, PORT);
  registerGmailRoutes(app, oauth2Client);
}
