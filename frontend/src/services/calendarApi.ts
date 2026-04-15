import { API_ENDPOINTS } from '../config/api';
import { Calendar, CalendarEvent } from '../types';
import { apiClient } from './apiClient';

export async function getCalendarConnectionStatus(): Promise<boolean> {
  const data = await apiClient.get<{ connected: boolean }>(
    API_ENDPOINTS.CALENDAR_STATUS
  );
  return data.connected;
}

export async function listCalendars(): Promise<Calendar[]> {
  return apiClient.get<Calendar[]>(API_ENDPOINTS.CALENDAR_LIST);
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
  return apiClient.get<CalendarEvent[]>(
    `${API_ENDPOINTS.CALENDAR_EVENTS}?${params.toString()}`
  );
}

export async function disconnectCalendar(): Promise<void> {
  return apiClient.delete(API_ENDPOINTS.CALENDAR_DISCONNECT);
}
