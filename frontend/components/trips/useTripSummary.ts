'use client';

import { useState, useEffect, useCallback } from 'react';
import { expenseApi, transportApi } from '@/lib/api';
import { ExpenseSummary, TripTransport } from '@/lib/types';

export interface TripCostSummary {
  transport: {
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

export function useTripSummary(tripId: number, budget?: number) {
  const [summary, setSummary] = useState<TripCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      const [expenseSummaryRes, transportRes] = await Promise.all([
        expenseApi.getSummary(tripId).catch(() => ({ data: null })),
        transportApi.getByTripId(tripId).catch(() => ({ data: [] })),
      ]);

      const expenseSummary: ExpenseSummary = expenseSummaryRes.data || {
        total: 0,
        paid_total: 0,
        unpaid_total: 0,
        by_category: {},
        count: 0,
      };
      const transports: TripTransport[] = transportRes.data || [];

      const transportTotals = transports.reduce(
        (acc, t) => {
          if (t.cost) {
            const cost = Number(t.cost);
            const currency = t.currency || 'USD';
            acc.total += cost;
            acc.count += 1;
            acc.byCurrency[currency] = (acc.byCurrency[currency] || 0) + cost;
          }
          return acc;
        },
        { total: 0, count: 0, byCurrency: {} as Record<string, number> }
      );

      const byCategory = expenseSummary.by_category || {};
      const expenseTotal = Number(expenseSummary.total) || 0;

      const costSummary: TripCostSummary = {
        transport: transportTotals,
        expenses: {
          total: expenseTotal,
          paid: Number(expenseSummary.paid_total) || 0,
          unpaid: Number(expenseSummary.unpaid_total) || 0,
          byCategory: byCategory,
          count: expenseSummary.count || 0,
        },
        grandTotal: transportTotals.total + expenseTotal,
      };

      setSummary(costSummary);
    } catch (error) {
      console.error('Error loading trip summary:', error);
      setSummary({
        transport: { total: 0, count: 0, byCurrency: {} },
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
