import apiService from './apiService';
import type { User } from '../lib/types';

export const userService = {
  async getAllUsers(): Promise<User[]> {
    const users = await apiService.get<User[]>('/users');
    // Only return users with status 'active'
    return users.filter(user => user.status === 'active');
  },

  async getUserById(id: string): Promise<User> {
    return await apiService.get<User>(`/users/${id}`);
  },

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    return await apiService.post<User>('/users', {
      ...user,
      status: 'active',
    });
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return await apiService.put<User>(`/users/${id}`, updates);
  },

  async deleteUser(id: string): Promise<void> {
    await apiService.delete(`/users/${id}`);
  }
}; 