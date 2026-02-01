'use client';

import { useTripSummary } from './useTripSummary';
import { Plane, Bed, Receipt, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface TripSummaryProps {
  tripId: number;
  budget?: number;
}

export function TripSummary({ tripId, budget }: TripSummaryProps) {
  const { summary, loading, remaining, budgetPercent } = useTripSummary(tripId, budget);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Separate accommodation from other expenses
  const accommodationCategories = ['accommodation', 'lodging', 'hotel', 'hostel', 'airbnb'];
  const byCategory = summary.expenses.byCategory || {};
  const accommodationTotal = Object.entries(byCategory).reduce(
    (total, [category, amount]) => {
      if (accommodationCategories.includes(category.toLowerCase())) {
        return total + Number(amount);
      }
      return total;
    },
    0
  );
  const expenseTotal = Number(summary.expenses.total) || 0;
  const otherExpensesTotal = expenseTotal - accommodationTotal;

  const isOverBudget = remaining !== null && remaining < 0;
  const hasNoCosts = summary.grandTotal === 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-blue-600" />
        Trip Budget Summary
      </h3>

      {hasNoCosts ? (
        <p className="text-gray-500 text-sm">No costs recorded yet. Add journeys or expenses to see your budget summary.</p>
      ) : (
        <>
          <div className="space-y-3">
            {/* Journeys */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Plane className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Journeys</span>
                {summary.journeys.count > 0 && (
                  <span className="text-xs text-gray-400">({summary.journeys.count})</span>
                )}
              </div>
              <span className="font-medium text-gray-800">
                ${Number(summary.journeys.total).toFixed(2)}
              </span>
            </div>

            {/* Accommodations */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Bed className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Accommodations</span>
              </div>
              <span className="font-medium text-gray-800">
                ${Number(accommodationTotal).toFixed(2)}
              </span>
            </div>

            {/* Other Expenses */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Receipt className="w-4 h-4 text-green-500" />
                <span className="text-sm">Other Expenses</span>
                {summary.expenses.count > 0 && (
                  <span className="text-xs text-gray-400">({summary.expenses.count})</span>
                )}
              </div>
              <span className="font-medium text-gray-800">
                ${Number(otherExpensesTotal).toFixed(2)}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-blue-200 my-2"></div>

            {/* Grand Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">Total Spent</span>
              <span className="font-bold text-lg text-gray-900">
                ${Number(summary.grandTotal).toFixed(2)}
              </span>
            </div>

            {/* Budget info */}
            {budget && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Budget</span>
                  <span className="text-gray-700">${Number(budget).toFixed(2)}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      isOverBudget ? 'bg-red-500' : budgetPercent > 80 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  ></div>
                </div>

                {/* Remaining */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {isOverBudget ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                      {isOverBudget ? 'Over Budget' : 'Remaining'}
                    </span>
                  </div>
                  <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    {isOverBudget ? '-' : ''}${Math.abs(Number(remaining) || 0).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Paid vs Unpaid breakdown */}
          {summary.expenses.count > 0 && (
            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Paid: ${Number(summary.expenses.paid).toFixed(2)}</span>
                <span>Unpaid: ${Number(summary.expenses.unpaid).toFixed(2)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
