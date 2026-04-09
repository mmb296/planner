import { API_ENDPOINTS } from '../config/api';
import { Calendar, CalendarEvent } from '../types';

async function handleJson<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_ERROR');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getCalendarConnectionStatus(): Promise<boolean> {
  const res = await fetch(API_ENDPOINTS.CALENDAR_STATUS);
  const data = await handleJson<{ connected: boolean }>(res);
  return data.connected;
}

export async function listCalendars(): Promise<Calendar[]> {
  const res = await fetch(API_ENDPOINTS.CALENDAR_LIST);
  return handleJson<Calendar[]>(res);
}

export async function fetchEvents(
  calendars: Calendar[],
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const ids = calendars.map((c) => c.id).filter(Boolean);
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString()
  });
  if (ids.length > 0) {
    params.set('calendarIds', ids.join(','));
  }
  const res = await fetch(
    `${API_ENDPOINTS.CALENDAR_EVENTS}?${params.toString()}`
  );
  return handleJson<CalendarEvent[]>(res);
}

export async function disconnectCalendar(): Promise<void> {
  const res = await fetch(API_ENDPOINTS.CALENDAR_DISCONNECT, {
    method: 'DELETE'
  });
  await handleJson(res);
}
