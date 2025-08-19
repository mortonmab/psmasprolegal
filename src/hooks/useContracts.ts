import { useState, useEffect } from 'react';
import { contractService } from '../services/contractService';
import type { Contract } from '../lib/types';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadContracts() {
    try {
      setLoading(true);
      setError(null);
      const data = await contractService.getAllContracts();
      setContracts(data || []);
    } catch (err) {
      console.error('Error loading contracts:', err);
      setError(err instanceof Error ? err : new Error('Failed to load contracts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  async function createContract(newContract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) {
    try {
      setError(null);
      const created = await contractService.createContract(newContract);
      setContracts(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Error creating contract:', err);
      const error = err instanceof Error ? err : new Error('Failed to create contract');
      setError(error);
      throw error;
    }
  }

  async function updateContract(id: string, updates: Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at'>>) {
    try {
      setError(null);
      const updated = await contractService.updateContract(id, updates);
      setContracts(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      console.error('Error updating contract:', err);
      const error = err instanceof Error ? err : new Error('Failed to update contract');
      setError(error);
      throw error;
    }
  }

  async function deleteContract(id: string) {
    try {
      setError(null);
      await contractService.deleteContract(id);
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting contract:', err);
      const error = err instanceof Error ? err : new Error('Failed to delete contract');
      setError(error);
      throw error;
    }
  }

  return {
    contracts,
    loading,
    error,
    createContract,
    updateContract,
    deleteContract,
    refresh: loadContracts
  };
}
