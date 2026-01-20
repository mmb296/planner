import { Calendar, CalendarEvent } from '../types';

const DISCOVERY_DOC =
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
// API key is optional for authenticated requests but recommended for better rate limiting
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || undefined;

let gapiLoadPromise: Promise<void> | null = null;
let cachedAccessToken: string | null = null;

/**
 * Ensure gapi client is loaded and initialized
 */
const ensureGapiLoaded = (): Promise<void> => {
  if (window.gapi?.client && 'calendar' in window.gapi.client) {
    return Promise.resolve();
  }

  if (gapiLoadPromise) {
    return gapiLoadPromise;
  }

  gapiLoadPromise = new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error('gapi library not loaded'));
      return;
    }

    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC]
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });

  return gapiLoadPromise;
};

const setAccessTokenIfChanged = (accessToken: string): void => {
  if (cachedAccessToken !== accessToken) {
    window.gapi.client.setToken({ access_token: accessToken });
    cachedAccessToken = accessToken;
  }
};

/**
 * Initialize gapi and set access token
 * Returns false if setup fails, true otherwise
 */
const ensureGapiReady = async (accessToken: string): Promise<boolean> => {
  try {
    await ensureGapiLoaded();
    setAccessTokenIfChanged(accessToken);
    return true;
  } catch (error) {
    console.error('Error setting up gapi client:', error);
    return false;
  }
};

/**
 * Fetch events from one or more calendars
 */
export const fetchEvents = async (
  calendars: Calendar[],
  timeMin: Date,
  timeMax: Date,
  accessToken: string
): Promise<CalendarEvent[]> => {
  if (!(await ensureGapiReady(accessToken))) {
    return [];
  }

  const fetchCalendarEvents = async (
    calendar: Calendar
  ): Promise<CalendarEvent[]> => {
    const response = await (window.gapi.client as any).calendar.events.list({
      calendarId: calendar.id,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime' as const
    });

    const items = response.result.items || [];
    return items.map((event: CalendarEvent) => ({
      ...event,
      calendarId: calendar.id,
      color: calendar.backgroundColor
    }));
  };

  try {
    const results = await Promise.all(calendars.map(fetchCalendarEvents));
    return results.flat();
  } catch (error: any) {
    // Handle auth errors - throw so Calendar can clear auth
    if (error.status === 401 || error.status === 403) {
      throw new Error('AUTH_ERROR');
    }
    // TODO: Handle non-auth errors individually
    // For now, if any calendars fail, return empty array
    return [];
  }
};

/**
 * List all calendars available to the user
 */
export const listCalendars = async (
  accessToken: string
): Promise<Array<Calendar>> => {
  if (!(await ensureGapiReady(accessToken))) {
    return [];
  }

  try {
    const response = await (
      window.gapi.client as any
    ).calendar.calendarList.list();
    return response.result.items || [];
  } catch (error: any) {
    // Handle auth errors - throw so caller can clear auth
    if (error.status === 401 || error.status === 403) {
      throw new Error('AUTH_ERROR');
    }
    return [];
  }
};
