import apiService from './apiService';

export interface ContractType {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const contractTypeService = {
  async getAllContractTypes(): Promise<ContractType[]> {
    return await apiService.get<ContractType[]>('/contract-types');
  },

  async getContractTypeById(id: string): Promise<ContractType> {
    return await apiService.get<ContractType>(`/contract-types/${id}`);
  },

  async createContractType(newContractType: Omit<ContractType, 'id' | 'created_at' | 'updated_at'>): Promise<ContractType> {
    return await apiService.post<ContractType>('/contract-types', newContractType);
  },

  async updateContractType(id: string, updates: Partial<Omit<ContractType, 'id' | 'created_at' | 'updated_at'>>): Promise<ContractType> {
    return await apiService.put<ContractType>(`/contract-types/${id}`, updates);
  },

  async deleteContractType(id: string): Promise<void> {
    await apiService.delete(`/contract-types/${id}`);
  }
};
