'use client';

import { BudgetImpact } from '@/lib/types';
import { AlertTriangle, X } from 'lucide-react';

interface BudgetExceededModalProps {
  impact: BudgetImpact;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function BudgetExceededModal({
  impact,
  onConfirm,
  onCancel,
}: BudgetExceededModalProps) {
  const currency = impact.base_currency || 'USD';
  const fmt = (n: number) => `${n.toFixed(2)} ${currency}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Budget Exceeded
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Adding this expense will exceed your trip budget.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            {impact.over_by != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Over budget by</span>
                <span className="font-semibold text-red-600">
                  {fmt(impact.over_by)}
                </span>
              </div>
            )}
            {impact.new_total != null && impact.budget != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">New total / Budget</span>
                <span className="font-medium text-gray-900">
                  {fmt(impact.new_total)} / {fmt(impact.budget)}
                </span>
              </div>
            )}
            {impact.percentage != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Budget usage</span>
                <span className="font-medium text-gray-900">
                  {impact.percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-md"
          >
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
