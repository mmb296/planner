const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  TASKS: `${API_BASE_URL}/api/tasks`,
  TASK: (id: number) => `${API_BASE_URL}/api/tasks/${id}`,
  TASK_COMPLETE: (id: number) => `${API_BASE_URL}/api/tasks/${id}/complete`,
  TASK_UNCOMPLETE: (id: number) => `${API_BASE_URL}/api/tasks/${id}/uncomplete`,
  PERIOD_DAYS_TOGGLE: `${API_BASE_URL}/api/period-days/toggle`,
  PERIOD_DAYS_RANGE: `${API_BASE_URL}/api/period-days/range`,
  PERIOD_DAYS_PREDICTION: `${API_BASE_URL}/api/period-days/prediction`,
  COUNTDOWN: `${API_BASE_URL}/api/countdown`
};
