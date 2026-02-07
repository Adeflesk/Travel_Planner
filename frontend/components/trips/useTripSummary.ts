'use client';

import { useState, useEffect, useCallback } from 'react';
import { expenseApi, journeyApi } from '@/lib/api';
import { ExpenseSummary, Journey } from '@/lib/types';

export interface TripCostSummary {
  journeys: {
    total: number;
    count: number;
    byCurrency: Record<string, number>;
  };
  expenses: {
    total: number;
    paid: number;
    unpaid: number;
    byCategory: Record<string, number>;
    count: number;
  };
  grandTotal: number;
}

const ACCOMMODATION_CATEGORIES = ['accommodation', 'lodging', 'hotel', 'hostel', 'airbnb'];

export function useTripSummary(tripId: number, budget?: number) {
  const [summary, setSummary] = useState<TripCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      const [expenseSummaryRes, journeysRes] = await Promise.all([
        expenseApi.getSummary(tripId).catch(() => ({ data: null })),
        journeyApi.getByTripId(tripId).catch(() => ({ data: [] })),
      ]);

      // Handle missing or invalid expense summary data
      const expenseSummary: ExpenseSummary = expenseSummaryRes.data || {
        total: 0,
        paid_total: 0,
        unpaid_total: 0,
        by_category: {},
        count: 0,
      };
      const journeys: Journey[] = journeysRes.data || [];

      // Calculate journey totals
      const journeyTotals = journeys.reduce(
        (acc, journey) => {
          if (journey.cost) {
            const cost = Number(journey.cost);
            const currency = journey.currency || 'USD';
            acc.total += cost;
            acc.count += 1;
            acc.byCurrency[currency] = (acc.byCurrency[currency] || 0) + cost;
          }
          return acc;
        },
        { total: 0, count: 0, byCurrency: {} as Record<string, number> }
      );

      // Get expense data
      const byCategory = expenseSummary.by_category || {};
      const expenseTotal = Number(expenseSummary.total) || 0;

      const costSummary: TripCostSummary = {
        journeys: journeyTotals,
        expenses: {
          total: expenseTotal,
          paid: Number(expenseSummary.paid_total) || 0,
          unpaid: Number(expenseSummary.unpaid_total) || 0,
          byCategory: byCategory,
          count: expenseSummary.count || 0,
        },
        grandTotal: journeyTotals.total + expenseTotal,
      };

      setSummary(costSummary);
    } catch (error) {
      console.error('Error loading trip summary:', error);
      // Set default empty summary on error
      setSummary({
        journeys: { total: 0, count: 0, byCurrency: {} },
        expenses: { total: 0, paid: 0, unpaid: 0, byCategory: {}, count: 0 },
        grandTotal: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const remaining = budget ? budget - (summary?.grandTotal || 0) : null;
  const budgetPercent = budget && summary ? (summary.grandTotal / budget) * 100 : 0;

  return {
    summary,
    loading,
    remaining,
    budgetPercent,
    reload: loadSummary,
  };
}
