'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/lib/types';
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

export function useExpenses(tripId: number) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    try {
      const response = await expenseApi.getByTripId(tripId);
      setExpenses(response.data);
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

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount.toString()),
    0
  );

  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  return {
    expenses,
    loading,
    totalExpenses,
    expensesByCategory,
    reload: loadExpenses,
    deleteExpense,
  };
}
