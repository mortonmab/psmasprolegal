import apiService from './apiService';
import type { Case, NewCase, CaseUpdate } from '../lib/types';

export const caseService = {
  async getAllCases(): Promise<Case[]> {
    return await apiService.get<Case[]>('/cases');
  },

  async getUserCases(userId: string): Promise<Case[]> {
    return await apiService.get<Case[]>(`/cases/user/${userId}`);
  },

  async getCaseById(id: string): Promise<Case> {
    return await apiService.get<Case>(`/cases/${id}`);
  },

  async createCase(newCase: NewCase): Promise<Case> {
    return await apiService.post<Case>('/cases', newCase);
  },

  async updateCase(id: string, updates: Partial<Omit<Case, 'id' | 'created_at' | 'updated_at'>>): Promise<Case> {
    return await apiService.put<Case>(`/cases/${id}`, updates);
  },

  async deleteCase(id: string): Promise<void> {
    await apiService.delete(`/cases/${id}`);
  },

  // Case Updates
  async getCaseUpdates(caseId: string): Promise<CaseUpdate[]> {
    return await apiService.get<CaseUpdate[]>(`/cases/${caseId}/updates`);
  },

  async createCaseUpdate(caseId: string, update: {
    user_id: string;
    update_type: CaseUpdate['update_type'];
    title: string;
    content?: string;
  }): Promise<CaseUpdate> {
    return await apiService.post<CaseUpdate>(`/cases/${caseId}/updates`, update);
  }
};
