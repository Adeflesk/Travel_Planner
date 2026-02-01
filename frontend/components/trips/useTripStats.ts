'use client';

import { useState, useEffect, useCallback } from 'react';
import { tripApi } from '@/lib/api';
import { TripStats } from '@/lib/types';

export function useTripStats(tripId: number) {
  const [stats, setStats] = useState<TripStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tripApi.getStats(tripId);
      setStats(response.data);
    } catch (err) {
      console.error('Error loading trip stats:', err);
      setError('Failed to load trip statistics');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    reload: loadStats,
  };
}
