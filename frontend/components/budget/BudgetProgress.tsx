'use client';

import { BudgetStatus } from '@/lib/types';

interface BudgetProgressProps {
  totalBudget: number | null;
  totalSpent: number;
  percentageUsed: number;
  remaining: number;
  status: BudgetStatus;
  bookedAmount?: number;
  estimatedAmount?: number;
  showDetails?: boolean;
  currency?: string;
}

const statusColors: Record<BudgetStatus, string> = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-orange-500',
  over: 'bg-red-500',
};

const statusBgColors: Record<BudgetStatus, string> = {
  normal: 'bg-emerald-100',
  warning: 'bg-amber-100',
  danger: 'bg-orange-100',
  over: 'bg-red-100',
};

const statusTextColors: Record<BudgetStatus, string> = {
  normal: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-orange-700',
  over: 'text-red-700',
};

export function BudgetProgress({
  totalBudget,
  totalSpent,
  percentageUsed,
  remaining,
  status,
  bookedAmount,
  estimatedAmount,
  showDetails = true,
  currency = 'USD',
}: BudgetProgressProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Cap the visual percentage at 100% for the progress bar
  const visualPercentage = Math.min(percentageUsed, 100);

  if (!totalBudget) {
    return (
      <div className="text-sm text-slate-500">
        <span className="font-medium">{formatCurrency(totalSpent)}</span> spent
        <span className="text-slate-400 ml-1">(no budget set)</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Main progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Budget</span>
          <span className="text-slate-600">
            {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
          </span>
        </div>

        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${statusColors[status]}`}
            style={{ width: `${visualPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${statusTextColors[status]}`}>
            {percentageUsed.toFixed(0)}% used
          </span>
          <span className="text-slate-500">
            {remaining >= 0
              ? `${formatCurrency(remaining)} remaining`
              : `${formatCurrency(Math.abs(remaining))} over budget`}
          </span>
        </div>
      </div>

      {/* Status indicator */}
      {status !== 'normal' && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${statusBgColors[status]} ${statusTextColors[status]}`}
        >
          {status === 'warning' && (
            <>
              <span>&#9888;</span>
              <span>Approaching budget limit</span>
            </>
          )}
          {status === 'danger' && (
            <>
              <span>&#128308;</span>
              <span>Almost at budget limit!</span>
            </>
          )}
          {status === 'over' && (
            <>
              <span>&#128680;</span>
              <span>Over budget by {formatCurrency(Math.abs(remaining))}</span>
            </>
          )}
        </div>
      )}

      {/* Booked vs Estimated breakdown */}
      {showDetails && bookedAmount !== undefined && estimatedAmount !== undefined && (
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Booked/Confirmed
            </span>
            <span className="font-medium text-slate-700">
              {formatCurrency(bookedAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              Estimated
            </span>
            <span className="font-medium text-slate-700">
              {formatCurrency(estimatedAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetProgress;
