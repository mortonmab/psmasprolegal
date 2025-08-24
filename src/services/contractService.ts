import apiService from './apiService';
import type { Contract } from '../lib/types';

export const contractService = {
  async getAllContracts(): Promise<Contract[]> {
    return await apiService.get<Contract[]>('/contracts');
  },

  async getContractById(id: string): Promise<Contract> {
    return await apiService.get<Contract>(`/contracts/${id}`);
  },

  async getContract(id: string): Promise<Contract> {
    return await apiService.get<Contract>(`/contracts/${id}`);
  },

  async createContract(newContract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    return await apiService.post<Contract>('/contracts', newContract);
  },

  async updateContract(id: string, updates: Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at'>>): Promise<Contract> {
    return await apiService.put<Contract>(`/contracts/${id}`, updates);
  },

  async deleteContract(id: string): Promise<void> {
    await apiService.delete(`/contracts/${id}`);
  },

  async getContractStats(): Promise<{
    totalContracts: number;
    activeContracts: number;
    expiringSoon: number;
    expiringThisWeek: number;
    activePercentage: number;
  }> {
    return await apiService.get('/contracts/stats');
  }
}; 