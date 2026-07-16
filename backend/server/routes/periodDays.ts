import express from 'express';

import { PeriodDaysDB } from '../../db/periodDaysStore.js';

function getPeriodStarts(periodDays: string[]): Date[] {
  const dates = periodDays.map((d) => new Date(d));
  const periodStarts: Date[] = [dates[0]];
  for (let i = 1; i < dates.length; i++) {
    const currentDate = dates[i];
    const previousDate = dates[i - 1];
    const daysDiff =
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
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

function calculatePeriodPrediction(periodDays: string[]): {
  nextPeriodDate: string | null;
  averageCycleLength: number | null;
} {
  if (periodDays.length === 0) {
    return { nextPeriodDate: null, averageCycleLength: null };
  }

  const periodStarts = getPeriodStarts(periodDays);

  if (periodStarts.length < 2) {
    return { nextPeriodDate: null, averageCycleLength: null };
  }

  const averageCycleLength = getAverageCycleLength(periodStarts);
  const lastPeriodStart = periodStarts[periodStarts.length - 1];
  const nextPeriodDate = new Date(lastPeriodStart);
  nextPeriodDate.setDate(
    nextPeriodDate.getDate() + Math.round(averageCycleLength)
  );

  return {
    nextPeriodDate: nextPeriodDate.toISOString().split('T')[0],
    averageCycleLength: Number(averageCycleLength.toFixed(1))
  };
}

export function registerPeriodDaysRoutes(app: express.Express) {
  app.post('/api/period-days/toggle', async (req, res) => {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    const result = await PeriodDaysDB.toggle(date);
    res.json(result);
  });

  app.get('/api/period-days/range', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }
    const periodDays = await PeriodDaysDB.getByDateRange(
      startDate as string,
      endDate as string | undefined
    );
    res.json(periodDays);
  });

  app.get('/api/period-days/prediction', async (req, res) => {
    const allPeriodDays = await PeriodDaysDB.getAll();
    res.json(calculatePeriodPrediction(allPeriodDays));
  });
}
