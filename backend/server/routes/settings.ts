import express from 'express';

import { CountdownConfigDB } from '../../db/countdownStore.js';

export function registerSettingsRoutes(app: express.Express) {
  app.get('/api/countdown', async (req, res) => {
    const config = await CountdownConfigDB.get();
    if (!config) {
      return res.status(404).json({ error: 'Countdown config not found' });
    }
    res.json(config);
  });

  app.put('/api/countdown', async (req, res) => {
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
  });
}
