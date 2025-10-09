const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  TASKS: `${API_BASE_URL}/api/tasks`,
  COMPLETIONS: `${API_BASE_URL}/api/completions`,
  // Helper to get a specific task
  TASK: (id: number) => `${API_BASE_URL}/api/tasks/${id}`
};
