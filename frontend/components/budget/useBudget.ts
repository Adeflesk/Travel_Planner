'use client';

import { useState, useEffect, useCallback } from 'react';
import { tripApi } from '@/lib/api';
import { BudgetStatusResponse } from '@/lib/types';

interface UseBudgetResult {
  budget: BudgetStatusResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBudget(tripId: number): UseBudgetResult {
  const [budget, setBudget] = useState<BudgetStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await tripApi.getBudgetStatus(tripId);
      setBudget(response.data);
    } catch (err) {
      console.error('Failed to fetch budget status:', err);
      setError('Failed to load budget status');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  return {
    budget,
    loading,
    error,
    refetch: fetchBudget,
  };
}

export default useBudget;
