import { useCallback, useEffect, useRef, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import { fetchEvents } from '../services/calendarApi';
import { Calendar, CalendarEvent } from '../types';
import { getFutureDate, getTodayDate } from '../utils/dateTime';

export function useCalendarEvents(
  isAuthenticated: boolean,
  calendars: Calendar[],
  numDays: number,
  onAuthError: () => Promise<void>
) {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const calendarsRef = useRef(calendars);
  calendarsRef.current = calendars;
  const numDaysRef = useRef(numDays);
  numDaysRef.current = numDays;

  const fetchUpcomingEvents = useCallback(
    async (calsToFetch = calendars, daysToFetch = numDays) => {
      try {
        const timeMin = getTodayDate();
        const timeMax = getFutureDate(daysToFetch);
        const events = await fetchEvents(calsToFetch, timeMin, timeMax);
        setAllEvents(events);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_ERROR') {
          await onAuthError();
        }
      }
    },
    [onAuthError]
  );

  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;
    fetchUpcomingEvents(calendars, numDays);
  }, [numDays, calendars, isAuthenticated, fetchUpcomingEvents]);

  /** Live updates when the server finishes a Google Calendar push sync */
  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;

    const es = new EventSource(API_ENDPOINTS.CALENDAR_EVENTS_STREAM);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (data.type !== 'calendar_updated') return;
        fetchUpcomingEvents(calendarsRef.current, numDaysRef.current);
      } catch {
        /* ignore malformed payloads */
      }
    };

    return () => {
      es.close();
    };
  }, [isAuthenticated, calendars.length, onAuthError, fetchUpcomingEvents]);

  const clearEvents = useCallback(() => setAllEvents([]), []);

  return { allEvents, clearEvents };
}
