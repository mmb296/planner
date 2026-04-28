import { useCallback, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import { apiClient } from '../services/apiClient';
import { formatDateString } from '../utils/dateTime';

export function usePeriodDays(startDate: Date, endDate: Date) {
  const [periodDays, setPeriodDays] = useState<Set<string>>(new Set());

  const startDateStr = formatDateString(startDate);
  const endDateStr = formatDateString(endDate);

  const fetchPeriodDays = useCallback(async () => {
    try {
      const dates = await apiClient.get<string[]>(
        `${API_ENDPOINTS.PERIOD_DAYS_RANGE}?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      setPeriodDays(new Set(dates));
    } catch (error) {
      console.error('Failed to fetch period days:', error);
    }
  }, [startDateStr, endDateStr]);

  const togglePeriodDay = async (date: string) => {
    try {
      const { isPeriod } = await apiClient.post<{ isPeriod: boolean }>(
        API_ENDPOINTS.PERIOD_DAYS_TOGGLE,
        { date }
      );
      setPeriodDays((prev) => {
        const newSet = new Set(prev);
        if (isPeriod) {
          newSet.add(date);
        } else {
          newSet.delete(date);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Failed to toggle period day:', error);
    }
  };

  useEffect(() => {
    fetchPeriodDays();
  }, [startDateStr, endDateStr, fetchPeriodDays]);

  return { periodDays, togglePeriodDay, refetch: fetchPeriodDays };
}
