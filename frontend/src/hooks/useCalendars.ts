import { useCallback, useEffect } from 'react';

import { CalendarAction } from '../context/CalendarContext';
import { listCalendars } from '../services/calendarApi';

export function useCalendars(
  isAuthenticated: boolean,
  dispatch: React.Dispatch<CalendarAction>
) {
  const fetchCalendars = useCallback(async () => {
    try {
      const list = await listCalendars();
      dispatch({ type: 'SET_CALENDARS', calendars: list });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        dispatch({ type: 'CLEAR_AUTH' });
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) fetchCalendars();
  }, [isAuthenticated, fetchCalendars]);
}
