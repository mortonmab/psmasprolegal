import { useState, useEffect } from 'react';
import { vendorService } from '../services/vendorService';
import type { Vendor } from '../lib/types';

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadVendors() {
    try {
      setLoading(true);
      setError(null);
      const data = await vendorService.getAllVendors();
      setVendors(data || []);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError(err instanceof Error ? err : new Error('Failed to load vendors'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVendors();
  }, []);

  async function createVendor(newVendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) {
    try {
      setError(null);
      const created = await vendorService.createVendor(newVendor);
      setVendors(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Error creating vendor:', err);
      const error = err instanceof Error ? err : new Error('Failed to create vendor');
      setError(error);
      throw error;
    }
  }

  return {
    vendors,
    loading,
    error,
    createVendor,
    refresh: loadVendors
  };
} 