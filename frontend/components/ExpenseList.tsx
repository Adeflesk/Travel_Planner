// components/ExpenseList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseFormData } from '@/lib/types';
import { expenseApi } from '@/lib/api';
import { format } from 'date-fns';
import { Trash2, TrendingUp, Edit2 } from 'lucide-react';

interface ExpenseListProps {
  tripId: number;
}

const categories = [
  'accommodation',
  'food',
  'transport',
  'activities',
  'shopping',
  'other',
];

export default function ExpenseList({ tripId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await expenseApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await expenseApi.create(formData);
      }
      setFormData({
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
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const handleEdit = (expense: Expense) => {
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

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
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
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this expense?')) {
      try {
        await expenseApi.delete(id);
        loadExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
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

  const getCategoryIcon = (category: string) => {
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

  const getCancelStatus = (cancelByDate: string) => {
    const today = new Date();
    const cancelDate = new Date(cancelByDate);
    const daysUntilCancel = Math.ceil((cancelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilCancel < 0) {
      return { color: 'text-red-600', label: 'Past cancel date', icon: '🚫' };
    } else if (daysUntilCancel <= 7) {
      return { color: 'text-orange-600', label: `Cancel by ${format(cancelDate, 'MMM dd')}`, icon: '⚠️' };
    } else {
      return { color: 'text-gray-600', label: `Cancel by ${format(cancelDate, 'MMM dd')}`, icon: '📅' };
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-3">
          {editingId ? 'Edit Expense' : 'Add Expense'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="e.g., Hotel booking, Dinner"
              required
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value)|| 0 })
              }
              placeholder="0.00"
              step="0.01"
              required
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              required
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Expense Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Cancel By Date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={formData.cancel_by_date || ''}
              onChange={(e) =>
                setFormData({ ...formData, cancel_by_date: e.target.value })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.booked || false}
              onChange={(e) =>
                setFormData({ ...formData, booked: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Booked</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.paid || false}
              onChange={(e) =>
                setFormData({ ...formData, paid: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Paid</span>
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                     hover:bg-blue-700"
          >
            {editingId ? 'Update Expense' : 'Add Expense'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg
                       hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 
                    text-white p-6 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Total Expenses</p>
            <p className="text-3xl font-bold">
              ${totalExpenses.toFixed(2)}
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-blue-200" />
        </div>

        {/* Category Breakdown */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(expensesByCategory).map(([category, amount]) => (
            <div
              key={category}
              className="bg-white bg-opacity-20 rounded px-3 py-2"
            >
              <p className="text-xs text-blue-100">
                {getCategoryIcon(category)}{' '}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </p>
              <p className="font-semibold">${amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No expenses yet</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex justify-between items-center border-b 
                       border-gray-200 py-3 hover:bg-gray-50 transition 
                       px-2 rounded"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {getCategoryIcon(expense.category)}
                  </span>
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <div className="flex items-center gap-3 text-sm
                                  text-gray-500 mt-1">
                      <span className="capitalize">
                        {expense.category}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </span>
                      {expense.booked && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">
                            📅 Booked
                          </span>
                        </>
                      )}
                      {expense.paid && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            ✓ Paid
                          </span>
                        </>
                      )}
                      {expense.cancel_by_date && !expense.paid && (
                        <>
                          <span>•</span>
                          <span className={`font-medium ${getCancelStatus(expense.cancel_by_date).color}`}>
                            {getCancelStatus(expense.cancel_by_date).icon} {getCancelStatus(expense.cancel_by_date).label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    ${parseFloat(expense.amount.toString()).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{expense.currency}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-blue-600 hover:text-blue-700 p-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}