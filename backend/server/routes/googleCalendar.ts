import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import { OAuthIntegration, OAuthTokenDB } from '../../db/database.js';
import { stopCalendarWatchChannel } from '../calendarWatch.js';
import {
  clearGoogleOAuthSession,
  isInvalidGrant
} from '../googleOAuthInvalidGrant.js';

export function registerGoogleCalendarRoutes(
  app: express.Express,
  calendarOAuth2Client: OAuth2Client
) {
  app.get('/api/calendar/status', async (req, res) => {
    const t = await OAuthTokenDB.getToken(OAuthIntegration.Calendar);
    const connected = !!(t?.refresh_token || t?.access_token);
    res.json({ connected });
  });

  app.get('/api/calendar/calendars', async (req, res) => {
    const saved = await OAuthTokenDB.getToken(OAuthIntegration.Calendar);
    if (!saved?.refresh_token && !saved?.access_token) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }
    calendarOAuth2Client.setCredentials(saved);

    try {
      const cal = google.calendar({
        version: 'v3',
        auth: calendarOAuth2Client
      });
      const { data } = await cal.calendarList.list();
      res.json(data.items || []);
    } catch (error) {
      if (isInvalidGrant(error)) {
        await clearGoogleOAuthSession(
          calendarOAuth2Client,
          OAuthIntegration.Calendar
        );
        return res.status(401).json({
          error:
            'Calendar access expired or was revoked. Sign in with Google Calendar again.'
        });
      }
      throw error;
    }
  });

  app.get('/api/calendar/events', async (req, res) => {
    const saved = await OAuthTokenDB.getToken(OAuthIntegration.Calendar);
    if (!saved?.refresh_token && !saved?.access_token) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }
    calendarOAuth2Client.setCredentials(saved);

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
      const cal = google.calendar({
        version: 'v3',
        auth: calendarOAuth2Client
      });

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
      if (isInvalidGrant(error)) {
        await clearGoogleOAuthSession(
          calendarOAuth2Client,
          OAuthIntegration.Calendar
        );
        return res.status(401).json({
          error:
            'Calendar access expired or was revoked. Sign in with Google Calendar again.'
        });
      }
      throw error;
    }
  });

  app.delete('/api/calendar/auth', async (req, res) => {
    await stopCalendarWatchChannel(calendarOAuth2Client);
    await OAuthTokenDB.clearToken(OAuthIntegration.Calendar);
    calendarOAuth2Client.setCredentials({});
    res.json({ message: 'Calendar disconnected' });
  });
}
