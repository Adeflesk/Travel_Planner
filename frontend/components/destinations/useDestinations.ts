'use client';

import { useState, useEffect, useCallback } from 'react';
import { Destination, Expense, DestinationAccommodation } from '@/lib/types';
import { destinationApi, tripApi } from '@/lib/api';

export function useDestinations(tripId: number) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [accommodationMap, setAccommodationMap] = useState<
    Map<number, { expenses: Expense[]; total: number }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const [destResponse, accommResponse] = await Promise.all([
        destinationApi.getByTripId(tripId),
        tripApi.getAccommodationExpenses(tripId),
      ]);
      setDestinations(destResponse.data);

      // Build accommodation map for quick lookup
      const map = new Map<number, { expenses: Expense[]; total: number }>();
      accommResponse.data.forEach((item: DestinationAccommodation) => {
        map.set(item.destination.id, {
          expenses: item.expenses,
          total: item.total,
        });
      });
      setAccommodationMap(map);
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

  const getAccommodationExpenses = useCallback(
    (dest: Destination) => {
      return accommodationMap.get(dest.id)?.expenses || [];
    },
    [accommodationMap]
  );

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return {
    destinations,
    loading,
    expandedId,
    reload,
    deleteDestination,
    getAccommodationExpenses,
    toggleExpanded,
  };
}
