'use client';

import { Expense } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit2 } from 'lucide-react';
import { getCategoryIcon } from './useExpenses';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

const getCancelStatus = (cancelByDate: string) => {
  const today = new Date();
  const cancelDate = new Date(cancelByDate);
  const daysUntilCancel = Math.ceil(
    (cancelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilCancel < 0) {
    return { color: 'text-red-600', label: 'Past cancel date', icon: '🚫' };
  } else if (daysUntilCancel <= 7) {
    return {
      color: 'text-orange-600',
      label: `Cancel by ${format(cancelDate, 'MMM dd')}`,
      icon: '⚠️',
    };
  } else {
    return {
      color: 'text-gray-600',
      label: `Cancel by ${format(cancelDate, 'MMM dd')}`,
      icon: '📅',
    };
  }
};

export function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  return (
    <div
      className="flex justify-between items-center border-b border-gray-200 py-3 hover:bg-gray-50 transition px-2 rounded"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getCategoryIcon(expense.category)}</span>
          <div>
            <p className="font-medium">{expense.description}</p>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="capitalize">{expense.category}</span>
              <span>•</span>
              <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
              {expense.booked && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 font-medium">📅 Booked</span>
                </>
              )}
              {expense.paid && (
                <>
                  <span>•</span>
                  <span className="text-green-600 font-medium">✓ Paid</span>
                </>
              )}
              {expense.cancel_by_date && !expense.paid && (
                <>
                  <span>•</span>
                  <span
                    className={`font-medium ${getCancelStatus(expense.cancel_by_date).color}`}
                  >
                    {getCancelStatus(expense.cancel_by_date).icon}{' '}
                    {getCancelStatus(expense.cancel_by_date).label}
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
            onClick={() => onEdit(expense)}
            className="text-blue-600 hover:text-blue-700 p-2"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="text-red-600 hover:text-red-700 p-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
