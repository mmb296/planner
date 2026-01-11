import express from 'express';

import { PeriodDaysDB } from '../../db/database.js';

export function registerPeriodDaysRoutes(app: express.Express) {
  // Toggle period day (add or remove)
  app.post('/api/period-days/toggle', async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) {
        return res.status(400).json({ error: 'date is required' });
      }
      const result = await PeriodDaysDB.toggle(date);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to toggle period day' });
    }
  });

  // Get period days for a date range
  app.get('/api/period-days/range', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate) {
        return res.status(400).json({ error: 'startDate is required' });
      }
      const periodDays = await PeriodDaysDB.getByDateRange(
        startDate as string,
        endDate as string | undefined
      );
      res.json(periodDays);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch period days' });
    }
  });
}
