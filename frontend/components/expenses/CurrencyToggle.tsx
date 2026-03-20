'use client';

import { ArrowLeftRight } from 'lucide-react';

interface CurrencyToggleProps {
  showBase: boolean;
  onToggle: () => void;
  label?: string;
}

export function CurrencyToggle({ showBase, onToggle, label }: CurrencyToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
      title={showBase ? 'Show original currency' : 'Show base currency'}
      aria-label={label ?? (showBase ? 'Show original currency' : 'Show base currency')}
    >
      <ArrowLeftRight className="w-3 h-3" />
      {showBase ? 'Base' : 'Original'}
    </button>
  );
}
