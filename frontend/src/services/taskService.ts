import { API_ENDPOINTS } from '../config/api';
import { Task } from '../types';

/**
 * Task API Service
 * Centralized service for all task-related API operations
 */

const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T | null> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (response.ok) {
    return response.json();
  }

  return null;
};

export const taskService = {
  /**
   * Fetch all tasks
   */
  getTasks: async (): Promise<Task[] | null> => {
    return request<Task[]>(API_ENDPOINTS.TASKS);
  },

  /**
   * Create a new task
   */
  createTask: async (
    title: string,
    repeatDays: number
  ): Promise<Task | null> => {
    return request<Task>(API_ENDPOINTS.TASKS, {
      method: 'POST',
      body: JSON.stringify({
        title,
        repeat_days: repeatDays
      })
    });
  },

  /**
   * Update an existing task
   */
  updateTask: async (
    id: number,
    title: string,
    repeatDays: number
  ): Promise<Task | null> => {
    return request<Task>(API_ENDPOINTS.TASK(id), {
      method: 'PUT',
      body: JSON.stringify({
        title,
        repeat_days: repeatDays
      })
    });
  },

  /**
   * Record a task completion
   */
  completeTask: async (taskId: number): Promise<void | null> => {
    return request<void>(API_ENDPOINTS.COMPLETIONS, {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId })
    });
  }
};
