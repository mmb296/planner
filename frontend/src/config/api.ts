const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  TASKS: `${API_BASE_URL}/api/tasks`,
  TASK: (id: number) => `${API_BASE_URL}/api/tasks/${id}`,
  TASK_COMPLETE: (id: number) => `${API_BASE_URL}/api/tasks/${id}/complete`,
  TASK_UNCOMPLETE: (id: number) => `${API_BASE_URL}/api/tasks/${id}/uncomplete`
};
