'use client';

import { ExpenseFormData } from '@/lib/types';
import { categories } from './useExpenses';
import { useTripContext } from '@/lib/trip-context';
import { getDateConstraints } from '@/lib/date-constraints';

interface ExpenseFormProps {
  formData: ExpenseFormData;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof ExpenseFormData>(
    field: K,
    value: ExpenseFormData[K]
  ) => void;
}

export function ExpenseForm({
  formData,
  isEditing,
  onSubmit,
  onCancel,
  updateField,
}: ExpenseFormProps) {
  // Get trip context for date constraints
  const tripContext = useTripContext();
  
  const dateConstraints = getDateConstraints(
    tripContext?.startDate,
    tripContext?.endDate,
    {
      allowBeforeStart: true,  // Allow expenses before trip (e.g., bookings)
      allowAfterEnd: true,      // Allow expenses after trip (e.g., charges)
      defaultTo: 'start',
    }
  );

  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-3">
        {isEditing ? 'Edit Expense' : 'Add Expense'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="e.g., Hotel booking, Dinner"
            required
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            required
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value)}
            required
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
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
            onChange={(e) => updateField('date', e.target.value)}
            min={dateConstraints.min}
            max={dateConstraints.max}
            required
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Cancel By Date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.cancel_by_date || ''}
            onChange={(e) => updateField('cancel_by_date', e.target.value)}
            min={dateConstraints.min}
            max={dateConstraints.max}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.booked || false}
            onChange={(e) => updateField('booked', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Booked</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.paid || false}
            onChange={(e) => updateField('paid', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Paid</span>
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {isEditing ? 'Update Expense' : 'Add Expense'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
