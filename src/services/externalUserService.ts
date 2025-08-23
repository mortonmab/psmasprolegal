import { apiService } from './apiService';

export interface ExternalUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExternalUserData {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
}

export interface UpdateExternalUserData {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
}

export class ExternalUserService {
  /**
   * Get all external users
   */
  static async getExternalUsers(): Promise<ExternalUser[]> {
    const response = await apiService.get('/external-users');
    return response.data || [];
  }

  /**
   * Create a new external user
   */
  static async createExternalUser(data: CreateExternalUserData): Promise<ExternalUser> {
    const response = await apiService.post('/external-users', data);
    return response.data;
  }

  /**
   * Get external user by ID
   */
  static async getExternalUserById(id: string): Promise<ExternalUser> {
    const response = await apiService.get(`/external-users/${id}`);
    return response.data;
  }

  /**
   * Update external user
   */
  static async updateExternalUser(id: string, data: UpdateExternalUserData): Promise<ExternalUser> {
    const response = await apiService.put(`/external-users/${id}`, data);
    return response.data;
  }

  /**
   * Delete external user
   */
  static async deleteExternalUser(id: string): Promise<boolean> {
    const response = await apiService.delete(`/external-users/${id}`);
    return response.success;
  }
}
