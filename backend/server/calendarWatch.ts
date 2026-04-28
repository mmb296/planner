import { randomBytes, randomUUID } from 'crypto';
import { google } from 'googleapis';

import { CalendarWatchDB } from '../db/calendarWatchStore.js';
import { CalendarOAuthTokenDB } from '../db/oauthStore.js';
import { broadcastCalendarEventsUpdated } from './calendarSse.js';

import type { Express, Request, Response } from 'express';
import type { OAuth2Client } from 'google-auth-library';
import type { calendar_v3 } from 'googleapis';
// Google requires TTL as a string in params
const WATCH_TTL_SECONDS = '604800';
const WATCH_RENEW_BUFFER_MS = 24 * 60 * 60 * 1000;

async function listCalendarIds(cal: calendar_v3.Calendar): Promise<string[]> {
  const { data } = await cal.calendarList.list();
  return (data.items ?? []).map((c) => c.id!).filter(Boolean);
}

async function getCalendarClient(
  oauth2Client: OAuth2Client
): Promise<calendar_v3.Calendar | null> {
  const saved = await CalendarOAuthTokenDB.getToken();
  if (!saved?.refresh_token && !saved?.access_token) return null;
  oauth2Client.setCredentials(saved);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

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

async function registerCalendarWatch(
  cal: calendar_v3.Calendar,
  calendarId: string,
  webhookUrl: string
): Promise<void> {
  const existing = await CalendarWatchDB.getByCalendarId(calendarId);
  if (existing?.channel_id && existing?.resource_id) {
    try {
      await cal.channels.stop({
        requestBody: {
          id: existing.channel_id,
          resourceId: existing.resource_id
        }
      });
    } catch (e) {
      console.warn(
        `[calendar watch] channels.stop (old channel for ${calendarId}):`,
        e
      );
    }
  }

  const channelId = randomUUID();
  const channelToken = randomBytes(24).toString('hex');

  const { data: watch } = await cal.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      params: { ttl: WATCH_TTL_SECONDS }
    }
  });

  const expirationRaw = watch.expiration;
  const expirationMs =
    typeof expirationRaw === 'string'
      ? parseInt(expirationRaw, 10)
      : Number(expirationRaw);

  const syncToken = await initializeSyncToken(cal, calendarId);

  await CalendarWatchDB.save({
    calendar_id: calendarId,
    channel_id: watch.id!,
    resource_id: watch.resourceId!,
    expiration_ms: expirationMs,
    sync_token: syncToken ?? null,
    channel_token: channelToken
  });

  console.log(
    `[calendar watch] Watch active for ${calendarId}; expires ${new Date(expirationMs).toISOString()}`
  );
}

export async function registerAllCalendarWatches(
  oauth2Client: OAuth2Client
): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.log(
      '[calendar watch] Skipped: set CALENDAR_WEBHOOK_URL to your public HTTPS webhook URL (e.g. ngrok + /api/calendar/webhook)'
    );
    return;
  }

  const cal = await getCalendarClient(oauth2Client);
  if (!cal) return;

  const calendarIds = await listCalendarIds(cal);
  await Promise.all(
    calendarIds.map((id) => registerCalendarWatch(cal, id, webhookUrl))
  );
}

async function initializeSyncToken(
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

async function advanceSyncToken(
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

async function syncCalendar(
  oauth2Client: OAuth2Client,
  calendarId: string
): Promise<void> {
  const cal = await getCalendarClient(oauth2Client);
  if (!cal) return;

  const row = await CalendarWatchDB.getByCalendarId(calendarId);
  if (!row?.calendar_id) return;

  if (!row.sync_token) {
    const token = await initializeSyncToken(cal, calendarId);
    await CalendarWatchDB.updateSyncToken(calendarId, token ?? null);
    broadcastCalendarEventsUpdated();
    return;
  }

  try {
    const newToken = await advanceSyncToken(cal, calendarId, row.sync_token);
    if (newToken) {
      await CalendarWatchDB.updateSyncToken(calendarId, newToken);
    }
    broadcastCalendarEventsUpdated();
  } catch (e: unknown) {
    const err = e as {
      code?: number;
      response?: { status?: number };
      message?: string;
    };
    const is410 =
      err?.code === 410 ||
      err?.response?.status === 410 ||
      err?.message?.includes('410');
    if (is410) {
      console.warn(
        '[calendar watch] sync token invalid (410); performing full resync'
      );
      const token = await initializeSyncToken(cal, calendarId);
      await CalendarWatchDB.updateSyncToken(calendarId, token ?? null);
      broadcastCalendarEventsUpdated();
    } else {
      throw e;
    }
  }
}

export async function stopAllCalendarWatches(
  oauth2Client: OAuth2Client
): Promise<void> {
  const rows = await CalendarWatchDB.getAll();
  const cal = await getCalendarClient(oauth2Client);

  if (rows.length > 0 && cal) {
    await Promise.all(
      rows
        .filter((r) => r.channel_id && r.resource_id)
        .map((r) =>
          cal.channels
            .stop({
              requestBody: { id: r.channel_id!, resourceId: r.resource_id! }
            })
            .catch((e) =>
              console.warn(
                `[calendar watch] channels.stop (${r.calendar_id}):`,
                e
              )
            )
        )
    );
  }

  await CalendarWatchDB.clearAll();
}

export async function renewExpiringCalendarWatches(
  oauth2Client: OAuth2Client
): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return;

  const cal = await getCalendarClient(oauth2Client);
  if (!cal) return;

  const calendarIds = await listCalendarIds(cal);
  const now = Date.now();
  await Promise.all(
    calendarIds.map(async (calendarId) => {
      const row = await CalendarWatchDB.getByCalendarId(calendarId);
      const exp = row?.expiration_ms;
      if (!row?.channel_id || !exp || exp - WATCH_RENEW_BUFFER_MS < now) {
        await registerCalendarWatch(cal, calendarId, webhookUrl);
      }
    })
  );
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
      syncCalendar(oauth2Client, calId).catch((e) =>
        console.error('[calendar watch] sync failed:', e)
      );
    });
  }
}
