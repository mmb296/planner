import express from 'express';

import { PeriodDaysDB } from '../../db/database.js';

function getPeriodStarts(periodDays: string[]): Date[] {
  const dates = periodDays.map((d) => new Date(d));
  const periodStarts: Date[] = [dates[0]];
  for (let i = 1; i < dates.length; i++) {
    const currentDate = dates[i];
    const previousDate = dates[i - 1];
    const daysDiff =
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
    // If there's a gap of more than 1 day, this is a new period start
    if (daysDiff > 1) {
      periodStarts.push(currentDate);
    }
  }
  return periodStarts;
}

function getAverageCycleLength(periodStarts: Date[]): number {
  const cycleLengths: number[] = [];
  for (let i = 1; i < periodStarts.length; i++) {
    const daysDiff =
      (periodStarts[i].getTime() - periodStarts[i - 1].getTime()) /
      (1000 * 60 * 60 * 24);
    cycleLengths.push(daysDiff);
  }
  return cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length;
}

// Calculate period prediction based on historical data
function calculatePeriodPrediction(periodDays: string[]): {
  nextPeriodDate: string | null;
  averageCycleLength: number | null;
} {
  let nextPeriodDate = null;
  let averageCycleLength = null;

  if (periodDays.length === 0) {
    return { nextPeriodDate, averageCycleLength };
  }

  const periodStarts = getPeriodStarts(periodDays);

  // Need at least 2 period starts to calculate a cycle
  if (periodStarts.length < 2) {
    return { nextPeriodDate, averageCycleLength };
  }

  averageCycleLength = getAverageCycleLength(periodStarts);

  // Predict next period start date
  const lastPeriodStart = periodStarts[periodStarts.length - 1];
  nextPeriodDate = new Date(lastPeriodStart);
  nextPeriodDate.setDate(
    nextPeriodDate.getDate() + Math.round(averageCycleLength)
  );

  return {
    nextPeriodDate: nextPeriodDate.toISOString().split('T')[0],
    averageCycleLength: Number(averageCycleLength.toFixed(1))
  };
}

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

  // Get period prediction
  app.get('/api/period-days/prediction', async (req, res) => {
    try {
      const allPeriodDays = await PeriodDaysDB.getAll();
      const prediction = calculatePeriodPrediction(allPeriodDays);
      res.json(prediction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to calculate period prediction' });
    }
  });
}
