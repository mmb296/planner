import { randomBytes, randomUUID } from 'crypto';
import { google } from 'googleapis';

import { CalendarWatchDB } from '../db/calendarWatchStore.js';
import { CalendarOAuthTokenDB } from '../db/oauthStore.js';
import { broadcastCalendarEventsUpdated } from './calendarSse.js';

import type { Express, Request, Response } from 'express';
import type { OAuth2Client } from 'google-auth-library';
import type { calendar_v3 } from 'googleapis';
const PRIMARY_CALENDAR = 'primary';
// Google requires TTL as a string in params
const WATCH_TTL_SECONDS = '604800';
const WATCH_RENEW_BUFFER_MS = 24 * 60 * 60 * 1000;

function getWebhookUrl(): string | undefined {
  const u = process.env.CALENDAR_WEBHOOK_URL?.trim();
  if (!u) return undefined;
  if (!u.startsWith('https://')) {
    console.warn(
      'CALENDAR_WEBHOOK_URL must be HTTPS (Google requirement). Watch disabled.'
    );
    return undefined;
  }
  return u.replace(/\/$/, '');
}

export async function registerPrimaryCalendarWatch(
  oauth2Client: OAuth2Client
): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.log(
      '[calendar watch] Skipped: set CALENDAR_WEBHOOK_URL to your public HTTPS webhook URL (e.g. ngrok + /api/calendar/webhook)'
    );
    return;
  }

  const saved = await CalendarOAuthTokenDB.getToken();
  if (!saved?.refresh_token && !saved?.access_token) {
    return;
  }
  oauth2Client.setCredentials(saved);

  const cal = google.calendar({ version: 'v3', auth: oauth2Client });

  const existing = await CalendarWatchDB.getByCalendarId(PRIMARY_CALENDAR);
  if (existing?.channel_id && existing?.resource_id) {
    try {
      await cal.channels.stop({
        requestBody: {
          id: existing.channel_id,
          resourceId: existing.resource_id
        }
      });
    } catch (e) {
      console.warn('[calendar watch] channels.stop (old channel):', e);
    }
  }

  const channelId = randomUUID();
  const channelToken = randomBytes(24).toString('hex');

  const { data: watch } = await cal.events.watch({
    calendarId: PRIMARY_CALENDAR,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      params: {
        ttl: WATCH_TTL_SECONDS
      }
    }
  });

  const expirationRaw = watch.expiration;
  const expirationMs =
    typeof expirationRaw === 'string'
      ? parseInt(expirationRaw, 10)
      : Number(expirationRaw);

  const syncToken = await fetchFullSyncToken(cal, PRIMARY_CALENDAR);

  await CalendarWatchDB.save({
    calendar_id: PRIMARY_CALENDAR,
    channel_id: watch.id!,
    resource_id: watch.resourceId!,
    expiration_ms: expirationMs,
    sync_token: syncToken ?? null,
    channel_token: channelToken
  });

  console.log(
    `[calendar watch] Watch active for primary calendar; expires ${new Date(expirationMs).toISOString()}`
  );
}

async function fetchFullSyncToken(
  cal: calendar_v3.Calendar,
  calendarId: string
): Promise<string | undefined> {
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const { data } = await cal.events.list({
      calendarId,
      singleEvents: true,
      maxResults: 250,
      pageToken
    });
    pageToken = data.nextPageToken || undefined;
    if (data.nextSyncToken) {
      nextSyncToken = data.nextSyncToken;
    }
  } while (pageToken);
  return nextSyncToken;
}

async function incrementalSyncPages(
  cal: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string
): Promise<string | undefined> {
  let nextSync: string | undefined;

  let { data } = await cal.events.list({
    calendarId,
    singleEvents: true,
    maxResults: 250,
    syncToken
  });

  while (true) {
    if (data.items?.length) {
      console.log(
        `[calendar watch] ${data.items.length} changed event(s) in incremental page`
      );
    }
    if (data.nextSyncToken) nextSync = data.nextSyncToken;
    if (!data.nextPageToken) break;

    ({ data } = await cal.events.list({
      calendarId,
      singleEvents: true,
      maxResults: 250,
      pageToken: data.nextPageToken
    }));
  }

  return nextSync;
}

async function runIncrementalSync(
  oauth2Client: OAuth2Client,
  calendarId: string
): Promise<void> {
  const saved = await CalendarOAuthTokenDB.getToken();
  if (!saved?.refresh_token && !saved?.access_token) {
    return;
  }
  oauth2Client.setCredentials(saved);

  const row = await CalendarWatchDB.getByCalendarId(calendarId);
  if (!row?.calendar_id) {
    return;
  }

  const cal = google.calendar({ version: 'v3', auth: oauth2Client });

  if (!row.sync_token) {
    const token = await fetchFullSyncToken(cal, calendarId);
    await CalendarWatchDB.updateSyncToken(calendarId, token ?? null);
    broadcastCalendarEventsUpdated();
    return;
  }

  try {
    const newToken = await incrementalSyncPages(
      cal,
      calendarId,
      row.sync_token
    );
    if (newToken) {
      await CalendarWatchDB.updateSyncToken(calendarId, newToken);
    }
    broadcastCalendarEventsUpdated();
  } catch (e: unknown) {
    const status =
      (e as { code?: number })?.code ??
      (e as { response?: { status?: number } })?.response?.status;
    const is410 =
      status === 410 || String((e as Error)?.message ?? '').includes('410');
    if (is410) {
      console.warn(
        '[calendar watch] sync token invalid (410); performing full resync'
      );
      const token = await fetchFullSyncToken(cal, calendarId);
      await CalendarWatchDB.updateSyncToken(calendarId, token ?? null);
      broadcastCalendarEventsUpdated();
    } else {
      throw e;
    }
  }
}

export async function stopCalendarWatchChannel(
  oauth2Client: OAuth2Client
): Promise<void> {
  const row = await CalendarWatchDB.getByCalendarId(PRIMARY_CALENDAR);
  const saved = await CalendarOAuthTokenDB.getToken();
  if (row?.channel_id && row?.resource_id && saved?.refresh_token) {
    oauth2Client.setCredentials(saved);
    try {
      const cal = google.calendar({ version: 'v3', auth: oauth2Client });
      await cal.channels.stop({
        requestBody: {
          id: row.channel_id,
          resourceId: row.resource_id
        }
      });
    } catch (e) {
      console.warn('[calendar watch] channels.stop:', e);
    }
  }
  await CalendarWatchDB.clear(PRIMARY_CALENDAR);
}

export async function renewCalendarWatchIfNeeded(
  oauth2Client: OAuth2Client
): Promise<void> {
  if (!getWebhookUrl()) {
    return;
  }
  const saved = await CalendarOAuthTokenDB.getToken();
  if (!saved?.refresh_token && !saved?.access_token) {
    return;
  }

  const row = await CalendarWatchDB.getByCalendarId(PRIMARY_CALENDAR);
  const now = Date.now();
  const exp = row?.expiration_ms;

  if (!row?.channel_id || !exp || exp - WATCH_RENEW_BUFFER_MS < now) {
    await registerPrimaryCalendarWatch(oauth2Client);
  }
}

export function registerCalendarWebhookRoute(
  app: Express,
  oauth2Client: OAuth2Client
): void {
  app.post('/api/calendar/webhook', (req: Request, res: Response) => {
    void handleCalendarWebhook(req, res, oauth2Client).catch((err) => {
      console.error('[calendar watch] webhook handler error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
  });
}

async function handleCalendarWebhook(
  req: Request,
  res: Response,
  oauth2Client: OAuth2Client
): Promise<void> {
  const channelId = req.get('X-Goog-Channel-ID');
  const resourceState = req.get('X-Goog-Resource-State');
  const tokenHeader = req.get('X-Goog-Channel-Token');

  if (!channelId) {
    res.status(400).json({ error: 'Missing X-Goog-Channel-ID' });
    return;
  }

  const row = await CalendarWatchDB.getByChannelId(channelId);
  if (!row) {
    res.status(403).json({ error: 'Unknown channel' });
    return;
  }
  if (row.channel_token && tokenHeader !== row.channel_token) {
    res.status(403).json({ error: 'Invalid channel token' });
    return;
  }

  res.status(200).end();

  if (resourceState === 'sync') {
    console.log('[calendar watch] Initial sync verification (sync)');
    return;
  }

  if (resourceState === 'exists' || resourceState === 'not_exists') {
    const calId = row.calendar_id;
    setImmediate(() => {
      runIncrementalSync(oauth2Client, calId).catch((e) =>
        console.error('[calendar watch] incremental sync failed:', e)
      );
    });
  }
}
