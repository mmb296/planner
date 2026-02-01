import express from 'express';

import { GoalEntry, GoalsDB } from '../../db/goalsStore.js';

export function registerGoalsRoutes(app: express.Express) {
  // Get all goals
  app.get('/api/goals', async (req, res) => {
    try {
      const goals = await GoalsDB.getAll();
      res.json(goals);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch goals' });
    }
  });

  // Get a specific goal by ID
  app.get('/api/goals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const goal = await GoalsDB.getById(id);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json(goal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch goal' });
    }
  });

  // Create a new goal
  app.post('/api/goals', async (req, res) => {
    try {
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  });

  // Update a goal
  app.put('/api/goals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const goal = await GoalsDB.update(id, updates);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json(goal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update goal' });
    }
  });

  // Delete a goal
  app.delete('/api/goals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await GoalsDB.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  });

  // Add or update an entry for a goal
  app.post('/api/goals/:id/entries', async (req, res) => {
    try {
      const { id } = req.params;
      const entry: GoalEntry = req.body;
      if (!entry.date) {
        return res.status(400).json({ error: 'date is required' });
      }
      const goal = await GoalsDB.getById(id);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      // Check if entry already exists
      const existingEntryIndex = goal.entries.findIndex(
        (e) => e.date === entry.date
      );
      let updatedGoal;
      if (existingEntryIndex >= 0) {
        // Update existing entry
        updatedGoal = await GoalsDB.updateEntry(id, entry.date, entry);
      } else {
        // Add new entry
        updatedGoal = await GoalsDB.addEntry(id, entry);
      }
      if (!updatedGoal) {
        return res.status(500).json({ error: 'Failed to save entry' });
      }
      res.json(updatedGoal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save entry' });
    }
  });

  // Delete an entry
  app.delete('/api/goals/:id/entries/:date', async (req, res) => {
    try {
      const { id, date } = req.params;
      const updatedGoal = await GoalsDB.deleteEntry(id, date);
      if (!updatedGoal) {
        return res.status(404).json({ error: 'Goal or entry not found' });
      }
      res.json(updatedGoal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  });
}
