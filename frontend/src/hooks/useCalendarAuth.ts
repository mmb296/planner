import { useEffect } from 'react';

import { CalendarAction } from '../context/CalendarContext';
import { getCalendarConnectionStatus } from '../services/calendarApi';

export function useCalendarAuth(dispatch: React.Dispatch<CalendarAction>) {
  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        const connected = await getCalendarConnectionStatus();
        if (cancelled) return;
        dispatch({
          type: 'SET_STATUS',
          status: connected ? 'authenticated' : 'unauthenticated'
        });
      } catch {
        if (!cancelled) {
          retryTimeout = setTimeout(checkStatus, 2000);
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, [dispatch]);
}
