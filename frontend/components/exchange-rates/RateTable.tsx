'use client';

import { CurrencyRateSummary } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RateTableProps {
  baseCurrency: string;
  currencies: CurrencyRateSummary[];
}

export function RateTable({ baseCurrency, currencies }: RateTableProps) {
  if (currencies.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No foreign currencies used yet. Add expenses in different currencies to see rates here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Currency</th>
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">
              Rate (1 {baseCurrency} =)
            </th>
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Trend</th>
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Data Points</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((c) => {
            const trend = getTrend(c);
            return (
              <tr key={c.target_currency} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-800">{c.target_currency}</td>
                <td className="py-3 px-4 font-mono text-slate-700">
                  {c.current_rate != null ? c.current_rate.toFixed(4) : '\u2014'}
                </td>
                <td className="py-3 px-4">
                  <TrendIndicator trend={trend} />
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">{c.history.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Trend = 'up' | 'down' | 'flat' | 'unknown';

function getTrend(c: CurrencyRateSummary): Trend {
  if (c.history.length < 2 || c.current_rate == null) return 'unknown';
  const oldest = c.history[0].rate;
  const diff = c.current_rate - oldest;
  if (Math.abs(diff) < 0.0001) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

function TrendIndicator({ trend }: { trend: Trend }) {
  switch (trend) {
    case 'up':
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingUp className="w-4 h-4" /> Up
        </span>
      );
    case 'down':
      return (
        <span className="flex items-center gap-1 text-red-600 text-sm">
          <TrendingDown className="w-4 h-4" /> Down
        </span>
      );
    case 'flat':
      return (
        <span className="flex items-center gap-1 text-slate-500 text-sm">
          <Minus className="w-4 h-4" /> Flat
        </span>
      );
    default:
      return <span className="text-sm text-slate-400">{'\u2014'}</span>;
  }
}
