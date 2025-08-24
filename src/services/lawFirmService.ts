import apiService from './apiService';
import type { LawFirm } from '../lib/types';

export const lawFirmService = {
  async getAllLawFirms(): Promise<LawFirm[]> {
    return await apiService.get<LawFirm[]>('/law-firms');
  },

  async getLawFirmById(id: string): Promise<LawFirm> {
    return await apiService.get<LawFirm>(`/law-firms/${id}`);
  },

  async getLawFirm(id: string): Promise<LawFirm> {
    return await apiService.get<LawFirm>(`/law-firms/${id}`);
  },

  async createLawFirm(newLawFirm: Omit<LawFirm, 'id' | 'created_at' | 'updated_at'>): Promise<LawFirm> {
    return await apiService.post<LawFirm>('/law-firms', newLawFirm);
  },

  async updateLawFirm(id: string, updates: Partial<Omit<LawFirm, 'id' | 'created_at' | 'updated_at'>>): Promise<LawFirm> {
    return await apiService.put<LawFirm>(`/law-firms/${id}`, updates);
  },

  async deleteLawFirm(id: string): Promise<void> {
    await apiService.delete(`/law-firms/${id}`);
  },

  async getLawFirmContracts(id: string): Promise<any[]> {
    return await apiService.get<any[]>(`/law-firms/${id}/contracts`);
  },

  async getLawFirmCases(id: string): Promise<any[]> {
    return await apiService.get<any[]>(`/law-firms/${id}/cases`);
  }
};
