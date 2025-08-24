import apiService from './apiService';
import type { Vendor } from '../lib/types';

export const vendorService = {
  async getAllVendors(): Promise<Vendor[]> {
    return await apiService.get<Vendor[]>('/vendors');
  },

  async getVendorById(id: string): Promise<Vendor> {
    return await apiService.get<Vendor>(`/vendors/${id}`);
  },

  async getVendor(id: string): Promise<Vendor> {
    return await apiService.get<Vendor>(`/vendors/${id}`);
  },

  async createVendor(newVendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
    return await apiService.post<Vendor>('/vendors', newVendor);
  },

  async updateVendor(id: string, updates: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>): Promise<Vendor> {
    return await apiService.put<Vendor>(`/vendors/${id}`, updates);
  },

  async deleteVendor(id: string): Promise<void> {
    await apiService.delete(`/vendors/${id}`);
  }
}; 