import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import { apiClient } from '../services/apiClient';
import { formatDateString } from '../utils/dateTime';

export function usePeriodDays(startDate: Date, endDate: Date) {
  const [periodDays, setPeriodDays] = useState<Set<string>>(new Set());

  const startDateStr = formatDateString(startDate);
  const endDateStr = formatDateString(endDate);

  const fetchPeriodDays = async () => {
    try {
      const dates = await apiClient.get<string[]>(
        `${API_ENDPOINTS.PERIOD_DAYS_RANGE}?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      setPeriodDays(new Set(dates));
    } catch (error) {
      console.error('Failed to fetch period days:', error);
    }
  };

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

  // Fetch period days when date range changes
  useEffect(() => {
    fetchPeriodDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDateStr, endDateStr]);

  return { periodDays, togglePeriodDay, refetch: fetchPeriodDays };
}
