import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import {
  formatDateString,
  getFutureDate,
  getTodayDate
} from '../utils/dateTime';

export function usePeriodDays(numDays: number) {
  const [periodDays, setPeriodDays] = useState<Set<string>>(new Set());

  // Fetch period days for the date range
  const fetchPeriodDays = async () => {
    const startDate = formatDateString(getTodayDate());
    const endDate = formatDateString(getFutureDate(numDays - 1));
    const response = await fetch(
      `${API_ENDPOINTS.PERIOD_DAYS_RANGE}?startDate=${startDate}&endDate=${endDate}`
    );
    if (response.ok) {
      const dates = await response.json();
      setPeriodDays(new Set(dates));
    }
  };

  // Toggle period day
  const togglePeriodDay = async (date: string) => {
    const response = await fetch(API_ENDPOINTS.PERIOD_DAYS_TOGGLE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date })
    });
    if (response.ok) {
      const { isPeriod } = await response.json();
      setPeriodDays((prev) => {
        const newSet = new Set(prev);
        if (isPeriod) {
          newSet.add(date);
        } else {
          newSet.delete(date);
        }
        return newSet;
      });
    }
  };

  // Fetch period days when days change
  useEffect(() => {
    fetchPeriodDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays]);

  return { periodDays, togglePeriodDay };
}
