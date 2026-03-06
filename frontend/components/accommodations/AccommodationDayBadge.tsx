'use client';

import { Home } from 'lucide-react';

interface AccommodationDayBadgeProps {
  type: 'check-in' | 'staying' | 'check-out';
  name: string;
}

const config = {
  'check-in': {
    bg: 'bg-green-50 border-green-200 text-green-700',
    label: 'Check-in',
  },
  staying: {
    bg: 'bg-gray-50 border-gray-200 text-gray-500',
    label: 'Staying at',
  },
  'check-out': {
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
    label: 'Check-out',
  },
};

export function AccommodationDayBadge({ type, name }: AccommodationDayBadgeProps) {
  const { bg, label } = config[type];
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${bg} w-fit`}>
      <Home className="w-3 h-3 shrink-0" />
      <span className="font-medium">{label}:</span>
      <span className="truncate max-w-[160px]">{name}</span>
    </div>
  );
}
