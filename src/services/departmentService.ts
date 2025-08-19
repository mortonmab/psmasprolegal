import apiService from './apiService';
import type { Department } from '../lib/types';

export const departmentService = {
  async getAllDepartments(): Promise<Department[]> {
    return await apiService.get<Department[]>('/departments');
  },

  async getDepartmentById(id: string): Promise<Department> {
    return await apiService.get<Department>(`/departments/${id}`);
  },

  async createDepartment(newDepartment: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<Department> {
    return await apiService.post<Department>('/departments', newDepartment);
  },

  async updateDepartment(id: string, updates: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at'>>): Promise<Department> {
    return await apiService.put<Department>(`/departments/${id}`, updates);
  },

  async deleteDepartment(id: string): Promise<void> {
    await apiService.delete(`/departments/${id}`);
  }
};
