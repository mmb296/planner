import { useCallback, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import { apiClient } from '../services/apiClient';

export type PeriodPrediction = {
  nextPeriodDate: string | null;
  averageCycleLength: number | null;
};

export function usePeriodPrediction() {
  const [prediction, setPrediction] = useState<PeriodPrediction | null>(null);

  const fetchPrediction = useCallback(async () => {
    try {
      const data = await apiClient.get<PeriodPrediction>(
        API_ENDPOINTS.PERIOD_DAYS_PREDICTION
      );
      setPrediction(data);
    } catch (error) {
      console.error('Error fetching period prediction:', error);
      setPrediction(null);
    }
  }, []);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  return { prediction, refetch: fetchPrediction };
}
