import { useCallback, useEffect, useState } from 'react';

import {
  disconnectCalendar,
  getCalendarConnectionStatus
} from '../services/calendarApi';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export function useCalendarAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        const connected = await getCalendarConnectionStatus();
        if (cancelled) return;
        setStatus(connected ? 'authenticated' : 'unauthenticated');
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
  }, []);

  const clearAuth = useCallback(async () => {
    try {
      await disconnectCalendar();
    } catch {
      /* ignore */
    }
    setStatus('unauthenticated');
  }, []);

  return { status, clearAuth };
}
