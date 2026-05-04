import express from 'express';

import { stopAllCalendarWatches } from '../calendarWatch.js';
import { CalendarOAuthSession } from '../googleOAuthSession.js';

import type { calendar_v3 } from 'googleapis';

export type CreateEventBody = {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  calendarId?: string;
  timeZone?: string;
};

export async function createCalendarEvent(
  cal: calendar_v3.Calendar,
  body: CreateEventBody
): Promise<{ id: string; htmlLink: string }> {
  const {
    title,
    date,
    startTime,
    endTime,
    location,
    description,
    calendarId = 'primary',
    timeZone = 'UTC'
  } = body;

  let start: { dateTime?: string; date?: string; timeZone?: string };
  let end: { dateTime?: string; date?: string; timeZone?: string };

  if (startTime) {
    start = { dateTime: `${date}T${startTime}:00`, timeZone };
    end = endTime ? { dateTime: `${date}T${endTime}:00`, timeZone } : start;
  } else {
    const [y, mo, d] = date.split('-').map(Number);
    const next = new Date(y, mo - 1, d + 1);
    const nextDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    start = { date };
    end = { date: nextDate };
  }

  const { data } = await cal.events.insert({
    calendarId,
    requestBody: { summary: title, location, description, start, end }
  });

  return { id: data.id!, htmlLink: data.htmlLink! };
}

export function registerGoogleCalendarRoutes(
  app: express.Express,
  session: CalendarOAuthSession
) {
  app.get('/api/calendar/status', (req, res) => {
    res.json({ connected: session.isConnected() });
  });

  app.get('/api/calendar/calendars', async (req, res) => {
    const cal = session.getCalendarClient();
    if (!cal) return res.status(401).json({ error: 'Calendar not connected' });

    try {
      const { data } = await cal.calendarList.list();
      res.json(data.items || []);
    } catch (error) {
      if (await session.rejectIfInvalidGrant(error, res)) return;
      throw error;
    }
  });

  app.get('/api/calendar/events', async (req, res) => {
    const cal = session.getCalendarClient();
    if (!cal) return res.status(401).json({ error: 'Calendar not connected' });

    const timeMin = req.query.timeMin as string | undefined;
    const timeMax = req.query.timeMax as string | undefined;
    const calendarIdsParam = req.query.calendarIds as string | undefined;

    if (!timeMin || !timeMax) {
      return res
        .status(400)
        .json({ error: 'timeMin and timeMax are required (ISO 8601)' });
    }

    const calendarIds = calendarIdsParam
      ? calendarIdsParam.split(',').filter(Boolean)
      : [];

    try {
      const { data: listData } = await cal.calendarList.list();
      const items = listData.items || [];
      const colorById = new Map(
        items.map((c) => [c.id!, c.backgroundColor || ''])
      );

      const idsToFetch =
        calendarIds.length > 0
          ? calendarIds
          : items.map((c) => c.id!).filter(Boolean);

      const allEvents = (
        await Promise.all(
          idsToFetch.map(async (calendarId) => {
            const { data } = await cal.events.list({
              calendarId,
              timeMin,
              timeMax,
              singleEvents: true,
              orderBy: 'startTime'
            });
            const evs = data.items || [];
            const bg = colorById.get(calendarId) || undefined;

            return evs.map((event) => ({
              ...event,
              calendarId,
              color: bg
            }));
          })
        )
      ).flat();

      res.json(allEvents);
    } catch (error) {
      if (await session.rejectIfInvalidGrant(error, res)) return;
      throw error;
    }
  });

  app.post('/api/calendar/events', async (req, res) => {
    const cal = session.getCalendarClient();
    if (!cal) return res.status(401).json({ error: 'Calendar not connected' });

    const body = req.body as CreateEventBody;
    if (!body.title || !body.date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    try {
      const result = await createCalendarEvent(cal, body);
      res.status(201).json(result);
    } catch (error) {
      if (await session.rejectIfInvalidGrant(error, res)) return;
      throw error;
    }
  });

  app.delete('/api/calendar/auth', async (req, res) => {
    await stopAllCalendarWatches(session);
    await session.clearSession();
    res.json({ message: 'Calendar disconnected' });
  });
}
