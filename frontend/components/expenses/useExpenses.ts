'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseSummary } from '@/lib/types';
import { expenseApi } from '@/lib/api';

export const categories = [
  'accommodation',
  'food',
  'transport',
  'activities',
  'shopping',
  'other',
];

export const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    accommodation: '🏨',
    food: '🍽️',
    transport: '🚗',
    activities: '🎭',
    shopping: '🛍️',
    other: '📦',
  };
  return icons[category] || '💰';
};

const defaultSummary: ExpenseSummary = {
  total: 0,
  paid_total: 0,
  unpaid_total: 0,
  by_category: {},
  count: 0,
};

export function useExpenses(tripId: number) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    try {
      const [expensesRes, summaryRes] = await Promise.all([
        expenseApi.getByTripId(tripId),
        expenseApi.getSummary(tripId),
      ]);
      setExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const deleteExpense = async (id: number) => {
    try {
      await expenseApi.delete(id);
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  return {
    expenses,
    loading,
    totalExpenses: summary.total,
    expensesByCategory: summary.by_category,
    paidTotal: summary.paid_total,
    unpaidTotal: summary.unpaid_total,
    reload: loadExpenses,
    deleteExpense,
  };
}
