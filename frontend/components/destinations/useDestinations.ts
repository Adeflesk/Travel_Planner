'use client';

import { useState, useEffect, useCallback } from 'react';
import { Destination, Expense } from '@/lib/types';
import { destinationApi, expenseApi } from '@/lib/api';

export function useDestinations(tripId: number) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const [destResponse, expResponse] = await Promise.all([
        destinationApi.getByTripId(tripId),
        expenseApi.getByTripId(tripId),
      ]);
      setDestinations(destResponse.data);
      setExpenses(expResponse.data);
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
      return expenses.filter((exp) => {
        if (exp.category !== 'accommodation') return false;

        // Manual link takes priority
        if (exp.destination_id === dest.id) return true;

        // Auto-link by date if no manual link
        // Exclude departure date since you check out that day
        if (!exp.destination_id && dest.arrival_date && dest.departure_date) {
          const expDate = new Date(exp.date);
          const arrival = new Date(dest.arrival_date);
          const departure = new Date(dest.departure_date);
          return expDate >= arrival && expDate < departure;
        }

        return false;
      });
    },
    [expenses]
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
