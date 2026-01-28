'use client';

import { TrendingUp } from 'lucide-react';
import { getCategoryIcon } from './useExpenses';

interface ExpenseSummaryProps {
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
}

export function ExpenseSummary({
  totalExpenses,
  expensesByCategory,
}: ExpenseSummaryProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm">Total Expenses</p>
          <p className="text-3xl font-bold">${totalExpenses.toFixed(2)}</p>
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
  );
}
