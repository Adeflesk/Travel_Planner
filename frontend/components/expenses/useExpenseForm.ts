'use client';

import { useState } from 'react';
import { Expense, ExpenseFormData, BudgetImpact } from '@/lib/types';
import { expenseApi } from '@/lib/api';

import { useTripCurrency } from '@/lib/trip-context';

const getInitialFormData = (tripId: number, currency: string): ExpenseFormData => ({
  trip_id: tripId,
  category: '',
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
  currency,
  booked: false,
  paid: false,
  cancel_by_date: '',
});

export function useExpenseForm(tripId: number, onSuccess: () => void) {
  const tripCurrency = useTripCurrency();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(
    getInitialFormData(tripId, tripCurrency)
  );
  const [budgetImpact, setBudgetImpact] = useState<BudgetImpact | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await expenseApi.update(editingId, formData);
        setEditingId(null);
      } else {
        // Check budget impact before creating
        const { data: impact } = await expenseApi.checkBudget(formData);
        if (impact.would_exceed) {
          setBudgetImpact(impact);
          return;
        }
        await expenseApi.create(formData);
      }
      setFormData(getInitialFormData(tripId, tripCurrency));
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const confirmSubmit = async () => {
    try {
      await expenseApi.create(formData);
      setBudgetImpact(null);
      setFormData(getInitialFormData(tripId, tripCurrency));
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const cancelBudgetAlert = () => {
    setBudgetImpact(null);
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      trip_id: tripId,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      currency: expense.currency,
      booked: expense.booked,
      paid: expense.paid,
      cancel_by_date: expense.cancel_by_date || '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(getInitialFormData(tripId, tripCurrency));
  };

  const updateField = <K extends keyof ExpenseFormData>(
    field: K,
    value: ExpenseFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    isEditing: editingId !== null,
    budgetImpact,
    handleSubmit,
    confirmSubmit,
    cancelBudgetAlert,
    startEdit,
    resetForm,
    updateField,
  };
}
