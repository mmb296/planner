import { API_ENDPOINTS } from '../config/api';
import { Task } from '../types';
import { apiClient } from './apiClient';

export async function getTasks(): Promise<Task[]> {
  return apiClient.get<Task[]>(API_ENDPOINTS.TASKS);
}

export async function createTask(
  title: string,
  repeatDays: number
): Promise<void> {
  await apiClient.post(API_ENDPOINTS.TASKS, { title, repeat_days: repeatDays });
}

export async function updateTask(
  id: number,
  title: string,
  repeatDays: number
): Promise<void> {
  await apiClient.put(API_ENDPOINTS.TASK(id), {
    title,
    repeat_days: repeatDays
  });
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.TASK(id));
}

export async function completeTask(id: number): Promise<void> {
  await apiClient.post(API_ENDPOINTS.TASK_COMPLETE(id));
}

export async function uncompleteTask(id: number): Promise<void> {
  await apiClient.post(API_ENDPOINTS.TASK_UNCOMPLETE(id));
}
