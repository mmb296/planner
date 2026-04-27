import { useEffect, useRef, useState } from 'react';

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

  const fetchUpcomingEvents = async (daysToFetch = numDays) => {
    try {
      const timeMin = getTodayDate();
      const timeMax = getFutureDate(daysToFetch);
      const events = await fetchEvents(calendars, timeMin, timeMax);
      setAllEvents(events);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        await onAuthError();
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;
    fetchUpcomingEvents(numDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays, calendars, isAuthenticated]);

  /** Live updates when the server finishes a Google Calendar push sync */
  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;

    const es = new EventSource(API_ENDPOINTS.CALENDAR_EVENTS_STREAM);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (data.type !== 'calendar_updated') return;
        const timeMin = getTodayDate();
        const timeMax = getFutureDate(numDaysRef.current);
        void fetchEvents(calendarsRef.current, timeMin, timeMax)
          .then(setAllEvents)
          .catch((err: unknown) => {
            if (err instanceof Error && err.message === 'AUTH_ERROR') {
              void onAuthError();
            }
          });
      } catch {
        /* ignore malformed payloads */
      }
    };

    return () => {
      es.close();
    };
  }, [isAuthenticated, calendars.length, onAuthError]);

  return { allEvents, setAllEvents, fetchUpcomingEvents };
}
