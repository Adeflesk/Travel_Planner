import React from 'react';
import { ScheduleWarning } from '@/lib/types';
import { AlertTriangle, Clock, Ban, EyeOff } from 'lucide-react';

interface ScheduleWarningBadgeProps {
  warning: ScheduleWarning;
}

export const ScheduleWarningBadge = ({ warning }: ScheduleWarningBadgeProps) => {
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = AlertTriangle;

  switch (warning.code) {
    case 'overrun':
      bgClass = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      break;
    case 'after_sunset':
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      Icon = EyeOff;
      break;
    case 'past_day_end':
      bgClass = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
      Icon = Clock;
      break;
    case 'missing_duration':
    case 'missing_drive_time':
      bgClass = 'bg-slate-50 text-slate-500 border-slate-200 text-xs';
      Icon = AlertTriangle;
      break;
    case 'crosses_midnight':
      bgClass = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
      Icon = Ban;
      break;
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-sm ${bgClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{warning.message}</span>
    </div>
  );
};
