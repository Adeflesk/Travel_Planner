'use client';

import { useState } from 'react';
import { Expense, ExpenseFormData } from '@/lib/types';
import { expenseApi } from '@/lib/api';

const getInitialFormData = (tripId: number): ExpenseFormData => ({
  trip_id: tripId,
  category: '',
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
  currency: 'USD',
  booked: false,
  paid: false,
  cancel_by_date: '',
});

export function useExpenseForm(tripId: number, onSuccess: () => void) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(
    getInitialFormData(tripId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await expenseApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await expenseApi.create(formData);
      }
      setFormData(getInitialFormData(tripId));
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
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
    setFormData(getInitialFormData(tripId));
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
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  };
}
