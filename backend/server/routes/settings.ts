import express from 'express';

import { CountdownConfigDB } from '../../db/database.js';

export function registerSettingsRoutes(app: express.Express) {
  // Get countdown config
  app.get('/api/countdown', async (req, res) => {
    try {
      const config = await CountdownConfigDB.get();
      if (!config) {
        return res.status(404).json({ error: 'Countdown config not found' });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch countdown config' });
    }
  });

  // Set countdown config
  app.put('/api/countdown', async (req, res) => {
    try {
      const { target_date, title } = req.body;
      if (!target_date) {
        return res.status(400).json({ error: 'target_date is required' });
      }
      await CountdownConfigDB.set(target_date, title);
      res.json({
        target_date,
        title,
        message: 'Countdown config updated successfully'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update countdown config' });
    }
  });
}
