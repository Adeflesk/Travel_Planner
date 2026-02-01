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
        expenseApi.getSummary(tripId),
        journeyApi.getByTripId(tripId),
      ]);

      const expenseSummary: ExpenseSummary = expenseSummaryRes.data;
      const journeys: Journey[] = journeysRes.data;

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

      // Calculate accommodation total from expenses
      const accommodationTotal = Object.entries(expenseSummary.by_category).reduce(
        (total, [category, amount]) => {
          if (ACCOMMODATION_CATEGORIES.includes(category.toLowerCase())) {
            return total + amount;
          }
          return total;
        },
        0
      );

      // Other expenses (non-accommodation)
      const otherExpensesTotal = expenseSummary.total - accommodationTotal;

      const costSummary: TripCostSummary = {
        journeys: journeyTotals,
        expenses: {
          total: expenseSummary.total,
          paid: expenseSummary.paid_total,
          unpaid: expenseSummary.unpaid_total,
          byCategory: expenseSummary.by_category,
          count: expenseSummary.count,
        },
        grandTotal: journeyTotals.total + expenseSummary.total,
      };

      setSummary(costSummary);
    } catch (error) {
      console.error('Error loading trip summary:', error);
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
