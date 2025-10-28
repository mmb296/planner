import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';

import {
  closeDatabase,
  initDatabase,
  RecurringTaskDB,
  TaskCompletionDB
} from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/auth/google/callback'
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
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code as string);
  oauth2Client.setCredentials(tokens);
  res.json(tokens); // In production, store securely in DB
});

// Gmail API route
app.get('/api/gmail/messages', async (req, res) => {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'Appointment'
    });

    if (!response.data.messages) {
      return res.json([]);
    }

    const messages = await Promise.all(
      response.data.messages.map(async (msg) => {
        if (!msg.id) return null;
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id
        });
        return full.data.snippet;
      })
    );

    res.json(messages.filter(Boolean));
  } catch (error) {
    console.error('Gmail API error:', error);
    res.status(500).json({ error: 'Failed to fetch Gmail messages' });
  }
});

// Task routes
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await RecurringTaskDB.getAll();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get a specific recurring task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await RecurringTaskDB.getById(parseInt(id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create new recurring task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, repeat_days } = req.body;
    if (!title || repeat_days === undefined) {
      return res
        .status(400)
        .json({ error: 'title and repeat_days are required' });
    }
    const result = await RecurringTaskDB.create({ title, repeat_days });
    res.status(201).json({
      id: result.lastID,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update recurring task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await RecurringTaskDB.update(parseInt(id), updates);
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete recurring task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await RecurringTaskDB.delete(parseInt(id));
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Task completion routes
app.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_at } = req.body;
    const result = await TaskCompletionDB.create(parseInt(id), completed_at);
    res.status(201).json({
      id: result.lastID,
      message: 'Completion recorded successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record completion' });
  }
});

// Delete task completion
app.delete('/api/completions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await TaskCompletionDB.delete(parseInt(id));
    res.json({ message: 'Completion deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete completion' });
  }
});

// Uncomplete a task (delete latest completion)
app.post('/api/tasks/:id/uncomplete', async (req, res) => {
  try {
    const { id } = req.params;
    await TaskCompletionDB.deleteLatestByTaskId(parseInt(id));
    res.json({ message: 'Task uncompleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to uncomplete task' });
  }
});

// Initialize database and start server
try {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await closeDatabase();
  process.exit(0);
});
