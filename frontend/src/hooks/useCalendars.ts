import { useCallback, useEffect, useState } from 'react';

import { listCalendars } from '../services/calendarApi';
import { Calendar } from '../types';

export function useCalendars(
  isAuthenticated: boolean,
  onAuthError: () => Promise<void>
) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    new Set()
  );

  const fetchCalendars = useCallback(async () => {
    try {
      const list = await listCalendars();
      setCalendars(list);
      setSelectedCalendarIds(new Set(list.map((cal) => cal.id)));
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        await onAuthError();
      }
    }
  }, [onAuthError]);

  useEffect(() => {
    if (isAuthenticated) fetchCalendars();
  }, [isAuthenticated, fetchCalendars]);

  const clearCalendars = useCallback(() => {
    setCalendars([]);
    setSelectedCalendarIds(new Set());
  }, []);

  const toggleCalendarSelection = useCallback(
    (id: string, checked: boolean) => {
      setSelectedCalendarIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    []
  );

  return {
    calendars,
    selectedCalendarIds,
    clearCalendars,
    toggleCalendarSelection
  };
}
