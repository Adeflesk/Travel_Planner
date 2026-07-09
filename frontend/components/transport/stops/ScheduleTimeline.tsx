import React from 'react';
import { ScheduleResponse, ScheduleWarning } from '@/lib/types';
import { ScheduleWarningBadge } from './ScheduleWarningBadge';
import { Sun, Moon, ArrowRight, Info } from 'lucide-react';

interface ScheduleTimelineProps {
  schedule: ScheduleResponse | null;
  loading: boolean;
}

export const ScheduleTimeline = ({ schedule, loading }: ScheduleTimelineProps) => {
  if (loading) {
    return (
      <div className="space-y-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50 animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-4 w-12 bg-slate-200 rounded" />
              <div className="h-8 flex-1 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!schedule || schedule.items.length === 0) {
    return (
      <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
        <Info className="w-5 h-5 mx-auto mb-2 text-slate-300" />
        No schedule computed yet. Add stops to generate a timeline.
      </div>
    );
  }

  // Separate day-level warnings from stop-level warnings
  const dayWarnings = schedule.warnings.filter((w) => w.stop_id === null || w.stop_id === undefined);
  const stopWarningsMap = new Map<number, ScheduleWarning[]>();
  schedule.warnings.forEach((w) => {
    if (w.stop_id !== null && w.stop_id !== undefined) {
      const list = stopWarningsMap.get(w.stop_id) || [];
      list.push(w);
      stopWarningsMap.set(w.stop_id, list);
    }
  });

  return (
    <div className="space-y-6">
      {/* Day Warnings */}
      {dayWarnings.length > 0 && (
        <div className="space-y-2">
          {dayWarnings.map((w, idx) => (
            <ScheduleWarningBadge key={idx} warning={w} />
          ))}
        </div>
      )}

      {/* Timeline Chain */}
      <div className="relative border-l-2 border-slate-150 pl-6 ml-3 space-y-8 py-2">
        {schedule.items.map((item, idx) => {
          const warnings = stopWarningsMap.get(item.id) || [];
          const isOverrun = item.overrun_minutes > 0;
          const isSlack = item.slack_before_minutes > 0;

          return (
            <div key={item.id} className="relative group">
              {/* Timeline Marker node */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-indigo-500 bg-white group-hover:scale-125 transition-transform" />

              <div className="space-y-2">
                {/* Time & Title Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {item.arrival_local}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {item.departure_local}
                  </span>
                  <span className="font-medium text-slate-900">{item.title}</span>

                  <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {item.timezone}
                  </span>
                </div>

                {/* Micro metrics */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {item.drive_minutes_from_previous > 0 && (
                    <span>Drive: {item.drive_minutes_from_previous} min</span>
                  )}
                  <span>Duration: {item.duration_minutes} min</span>

                  {isSlack && (
                    <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                      Spare time: +{item.slack_before_minutes} min
                    </span>
                  )}

                  {isOverrun && (
                    <span className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded animate-pulse">
                      Late by: {item.overrun_minutes} min
                    </span>
                  )}
                </div>

                {/* Specific warning list */}
                {warnings.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {warnings.map((w, wIdx) => (
                      <ScheduleWarningBadge key={wIdx} warning={w} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sunset & Summary info box */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
        {schedule.sunset && (
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>
              Sunset today: <strong className="text-slate-800 font-mono">{new Date(schedule.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          </div>
        )}
        {schedule.day_end && (
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span>
              Final Arrival: <strong className="text-slate-800 font-mono">{new Date(schedule.day_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
