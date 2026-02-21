'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PracticalityResponse } from '@/lib/types';
import { journeyApi } from '@/lib/api';
import { Clock, DollarSign } from 'lucide-react';

interface PracticalityBarProps {
  journeyId: number;
  refreshKey?: number;
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const getBarColor = (value: number, limit: number): string => {
  const ratio = value / limit;
  if (ratio > 1) return 'bg-red-500';
  if (ratio > 0.85) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getTextColor = (feasible: boolean): string => {
  return feasible ? 'text-emerald-700' : 'text-red-700';
};

export function PracticalityBar({ journeyId, refreshKey }: PracticalityBarProps) {
  const [data, setData] = useState<PracticalityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchData = useCallback(() => {
    journeyApi
      .getPracticality(journeyId)
      .then((res) => {
        if (mountedRef.current) {
          const d = res.data;
          setData({
            ...d,
            total_cost: Number(d.total_cost),
            daily_budget: d.daily_budget !== null ? Number(d.daily_budget) : null,
          });
        }
      })
      .catch(() => {
        if (mountedRef.current) setData(null);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [journeyId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData, refreshKey]);

  if (loading) {
    return (
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (!data || (data.total_duration_minutes === 0 && data.total_cost === 0)) {
    return null;
  }

  const timePercent = Math.min(
    (data.total_duration_minutes / data.time_limit_minutes) * 100,
    100
  );
  const budgetPercent = data.daily_budget
    ? Math.min((data.total_cost / data.daily_budget) * 100, 100)
    : 0;

  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-gray-200">
      <div className="flex gap-6">
        {/* Time bar */}
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className={`text-xs font-medium ${getTextColor(data.time_feasible)}`}>
              {formatDuration(data.total_duration_minutes)} / {formatDuration(data.time_limit_minutes)}
            </span>
            {data.transition_count > 0 && (
              <span className="text-xs text-slate-400">
                (incl. {data.transition_count} x {data.buffer_minutes_per_transition}m buffer)
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(data.total_duration_minutes, data.time_limit_minutes)}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>
        </div>

        {/* Budget bar */}
        {data.daily_budget !== null && data.daily_budget > 0 && (
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span className={`text-xs font-medium ${getTextColor(data.budget_feasible)}`}>
                ${data.total_cost.toFixed(0)} / ${data.daily_budget.toFixed(0)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(data.total_cost, data.daily_budget)}`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
