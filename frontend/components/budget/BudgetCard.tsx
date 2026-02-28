'use client';

import { Wallet } from 'lucide-react';
import { useBudget } from './useBudget';
import { BudgetProgress } from './BudgetProgress';
import { BudgetBreakdown } from './BudgetBreakdown';
import { useTripCurrency } from '@/lib/trip-context';

interface BudgetCardProps {
  tripId: number;
  showBreakdown?: boolean;
}

export function BudgetCard({ tripId, showBreakdown = true }: BudgetCardProps) {
  const { budget, loading, error } = useBudget(tripId);
  const currency = useTripCurrency();

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-2.5 bg-slate-200 rounded w-full"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !budget) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main Budget Progress Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          Budget Status
        </h3>

        <BudgetProgress
          totalBudget={budget.total_budget}
          totalSpent={budget.total_spent}
          percentageUsed={budget.percentage_used}
          remaining={budget.remaining}
          status={budget.status}
          bookedAmount={budget.booked_amount}
          estimatedAmount={budget.estimated_amount}
          showDetails={true}
          currency={currency}
        />
      </div>

      {/* Category Breakdown */}
      {showBreakdown && budget.by_category.length > 0 && (
        <BudgetBreakdown
          categories={budget.by_category}
          totalBudget={budget.total_budget}
          defaultExpanded={false}
          currency={currency}
        />
      )}
    </div>
  );
}

export default BudgetCard;
