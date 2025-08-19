import { useState, useEffect } from 'react';
import { caseService } from '../services/caseService';
import { useAuth } from './useAuth';
import type { Case } from '../lib/types';

export function useCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [userCases, setUserCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      loadCases();
    }
  }, [user]);

  async function loadCases() {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const [allCases, userCasesData] = await Promise.all([
        caseService.getAllCases(),
        caseService.getUserCases(user.id)
      ]);
      console.log('Loaded cases:', allCases);
      console.log('Loaded user cases:', userCasesData);
      setCases(allCases);
      setUserCases(userCasesData);
    } catch (err) {
      console.error('Error loading cases:', err);
      setError(err instanceof Error ? err : new Error('Failed to load cases'));
    } finally {
      setLoading(false);
    }
  }

  async function createCase(newCase: Omit<Case, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const created = await caseService.createCase(newCase);
      setCases(prev => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create case'));
      throw err;
    }
  }

  async function updateCase(id: string, updates: Partial<Omit<Case, 'id' | 'created_at' | 'updated_at'>>) {
    try {
      const updated = await caseService.updateCase(id, updates);
      setCases(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update case'));
      throw err;
    }
  }

  async function deleteCase(id: string) {
    try {
      await caseService.deleteCase(id);
      setCases(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete case'));
      throw err;
    }
  }

  return {
    cases,
    userCases,
    loading,
    error,
    createCase,
    updateCase,
    deleteCase,
    refresh: loadCases
  };
} 