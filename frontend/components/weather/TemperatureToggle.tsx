'use client';

import { TemperatureUnit } from '@/lib/types';

interface TemperatureToggleProps {
  unit: TemperatureUnit;
  onToggle: () => void;
}

export function TemperatureToggle({ unit, onToggle }: TemperatureToggleProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering parent click events
        onToggle();
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded transition-colors hover:bg-white/50"
      title="Toggle temperature unit"
    >
      <span className={unit === 'F' ? 'font-bold' : 'opacity-60'}>°F</span>
      <span className="opacity-40">/</span>
      <span className={unit === 'C' ? 'font-bold' : 'opacity-60'}>°C</span>
    </button>
  );
}
