import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';

export type PeriodPrediction = {
  nextPeriodDate: string | null;
  averageCycleLength: number | null;
};

export function usePeriodPrediction() {
  const [prediction, setPrediction] = useState<PeriodPrediction | null>(null);

  const fetchPrediction = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PERIOD_DAYS_PREDICTION);
      if (response.ok) {
        const data = await response.json();
        setPrediction(data);
      } else {
        setPrediction(null);
      }
    } catch (error) {
      console.error('Error fetching period prediction:', error);
      setPrediction(null);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  return { prediction, refetch: fetchPrediction };
}
