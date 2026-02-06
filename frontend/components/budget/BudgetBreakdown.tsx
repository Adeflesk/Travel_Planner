'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CategoryBudget, BudgetStatus } from '@/lib/types';

interface BudgetBreakdownProps {
  categories: CategoryBudget[];
  totalBudget: number | null;
  defaultExpanded?: boolean;
}

const categoryIcons: Record<string, string> = {
  transport: '🚗',
  transportation: '🚗',
  flight: '✈️',
  flights: '✈️',
  accommodation: '🏨',
  lodging: '🏨',
  hotel: '🏨',
  food: '🍽️',
  dining: '🍽️',
  activities: '🎭',
  entertainment: '🎭',
  shopping: '🛍️',
  other: '📦',
};

const statusColors: Record<BudgetStatus, string> = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-orange-500',
  over: 'bg-red-500',
};

const statusTextColors: Record<BudgetStatus, string> = {
  normal: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-orange-600',
  over: 'text-red-600',
};

export function BudgetBreakdown({
  categories,
  totalBudget,
  defaultExpanded = false,
}: BudgetBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    return categoryIcons[lowerCategory] || categoryIcons.other;
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-900">Budget Breakdown</span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Category list */}
          {categories.map((cat) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  <span>{getCategoryIcon(cat.category)}</span>
                  <span>{getCategoryLabel(cat.category)}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {formatCurrency(cat.spent)}
                  </span>
                  {cat.status !== 'normal' && (
                    <span className={`text-xs font-medium ${statusTextColors[cat.status]}`}>
                      {cat.status === 'over' ? '!' : '⚠'}
                    </span>
                  )}
                </div>
              </div>

              {/* Mini progress bar */}
              {totalBudget && totalBudget > 0 && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${statusColors[cat.status]}`}
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
              )}

              {/* Percentage */}
              {totalBudget && totalBudget > 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{cat.percentage.toFixed(0)}% of budget</span>
                  {cat.booked > 0 && cat.estimated > 0 && (
                    <span>
                      {formatCurrency(cat.booked)} booked, {formatCurrency(cat.estimated)} est.
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Legend */}
          <div className="pt-3 mt-3 border-t border-slate-200">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Under 75%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                75-90%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Over 90%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetBreakdown;
