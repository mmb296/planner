import express from 'express';

import { RecurringTaskDB, TaskCompletionDB } from '../../db/tasksStore.js';

export function registerTaskRoutes(app: express.Express) {
  app.get('/api/tasks', async (req, res) => {
    const tasks = await RecurringTaskDB.getAll();
    res.json(tasks);
  });

  app.get('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const task = await RecurringTaskDB.getById(parseInt(id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  });

  app.post('/api/tasks', async (req, res) => {
    const { title, repeat_days } = req.body;
    if (!title || repeat_days === undefined) {
      return res
        .status(400)
        .json({ error: 'title and repeat_days are required' });
    }
    const result = await RecurringTaskDB.create({ title, repeat_days });
    res
      .status(201)
      .json({ id: result.lastID, message: 'Task created successfully' });
  });

  app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    await RecurringTaskDB.update(parseInt(id), req.body);
    res.json({ message: 'Task updated successfully' });
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    await RecurringTaskDB.delete(parseInt(id));
    res.json({ message: 'Task deleted successfully' });
  });

  app.post('/api/tasks/:id/complete', async (req, res) => {
    const { id } = req.params;
    const { completed_at } = req.body;
    const result = await TaskCompletionDB.create(parseInt(id), completed_at);
    res
      .status(201)
      .json({ id: result.lastID, message: 'Completion recorded successfully' });
  });

  app.delete('/api/completions/:id', async (req, res) => {
    const { id } = req.params;
    await TaskCompletionDB.delete(parseInt(id));
    res.json({ message: 'Completion deleted successfully' });
  });

  app.post('/api/tasks/:id/uncomplete', async (req, res) => {
    const { id } = req.params;
    await TaskCompletionDB.deleteLatestByTaskId(parseInt(id));
    res.json({ message: 'Task uncompleted successfully' });
  });
}
