import express from 'express';

import { GoalEntry, GoalsDB } from '../../db/goalsStore.js';

export function registerGoalsRoutes(app: express.Express) {
  app.get('/api/goals', async (req, res) => {
    const goals = await GoalsDB.getAll();
    res.json(goals);
  });

  app.get('/api/goals/:id', async (req, res) => {
    const { id } = req.params;
    const goal = await GoalsDB.getById(id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(goal);
  });

  app.post('/api/goals', async (req, res) => {
    const { name, start, end, frequency } = req.body;
    if (!name || !start || !end) {
      return res
        .status(400)
        .json({ error: 'name, start, and end are required' });
    }
    const goal = await GoalsDB.create({
      name,
      start,
      end,
      frequency,
      entries: []
    });
    res.status(201).json(goal);
  });

  app.put('/api/goals/:id', async (req, res) => {
    const { id } = req.params;
    const goal = await GoalsDB.update(id, req.body);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(goal);
  });

  app.delete('/api/goals/:id', async (req, res) => {
    const { id } = req.params;
    const deleted = await GoalsDB.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json({ message: 'Goal deleted successfully' });
  });

  app.post('/api/goals/:id/entries', async (req, res) => {
    const { id } = req.params;
    const entry: GoalEntry = req.body;
    if (!entry.date) {
      return res.status(400).json({ error: 'date is required' });
    }
    const updatedGoal = await GoalsDB.addEntry(id, entry);
    if (!updatedGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(updatedGoal);
  });

  app.put('/api/goals/:id/entries/:entryId', async (req, res) => {
    const { id, entryId } = req.params;
    const updatedGoal = await GoalsDB.updateEntry(
      id,
      entryId,
      req.body as Partial<GoalEntry>
    );
    if (!updatedGoal) {
      return res.status(404).json({ error: 'Goal or entry not found' });
    }
    res.json(updatedGoal);
  });

  app.delete('/api/goals/:id/entries/:entryId', async (req, res) => {
    const { id, entryId } = req.params;
    const updatedGoal = await GoalsDB.deleteEntry(id, entryId);
    if (!updatedGoal) {
      return res.status(404).json({ error: 'Goal or entry not found' });
    }
    res.json(updatedGoal);
  });
}
