'use client';

import { useState, useEffect, useCallback } from 'react';
import { Destination } from '@/lib/types';
import { destinationApi } from '@/lib/api';

export function useDestinations(tripId: number) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const destResponse = await destinationApi.getByTripId(tripId);
      setDestinations(destResponse.data);
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const deleteDestination = async (id: number) => {
    try {
      await destinationApi.delete(id);
      reload();
    } catch (error) {
      console.error('Error deleting destination:', error);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return {
    destinations,
    loading,
    expandedId,
    reload,
    deleteDestination,
    toggleExpanded,
  };
}
