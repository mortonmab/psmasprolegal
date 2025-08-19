import apiService from './apiService';
import type { Task } from '../lib/types';

export const taskService = {
  async getAllTasks(): Promise<Task[]> {
    return await apiService.get<Task[]>('/tasks');
  },

  async getTaskById(id: string): Promise<Task> {
    return await apiService.get<Task>(`/tasks/${id}`);
  },

  async createTask(newTask: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    return await apiService.post<Task>('/tasks', newTask);
  },

  async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>): Promise<Task> {
    return await apiService.put<Task>(`/tasks/${id}`, updates);
  },

  async deleteTask(id: string): Promise<void> {
    await apiService.delete(`/tasks/${id}`);
  }
};
