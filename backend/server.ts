import express from 'express';

import { closeDatabase, initDatabase, RecurringTaskDB } from './database.js';

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

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Planner API is running!' });
});

// Get all recurring tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await RecurringTaskDB.getAll();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create new recurring task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, repeat_days } = req.body;
    console.log(title, repeat_days);
    if (!title || repeat_days === undefined) {
      return res
        .status(400)
        .json({ error: 'title and repeat_days are required' });
    }
    const result = await RecurringTaskDB.create({ title, repeat_days });
    res.status(201).json({
      id: (result as any).lastID,
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
