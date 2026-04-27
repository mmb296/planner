import { useCallback, useEffect, useRef } from 'react';

import { API_ENDPOINTS } from '../config/api';
import { CalendarAction } from '../context/CalendarContext';
import { fetchEvents } from '../services/calendarApi';
import { Calendar } from '../types';
import { getFutureDate, getTodayDate } from '../utils/dateTime';

export function useCalendarEvents(
  isAuthenticated: boolean,
  calendars: Calendar[],
  numDays: number,
  dispatch: React.Dispatch<CalendarAction>
) {
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
        dispatch({ type: 'SET_EVENTS', events });
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_ERROR') {
          dispatch({ type: 'CLEAR_AUTH' });
        }
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;
    fetchUpcomingEvents(calendars, numDays);
  }, [numDays, calendars, isAuthenticated, fetchUpcomingEvents]);

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
  }, [isAuthenticated, calendars.length, fetchUpcomingEvents]);
}
