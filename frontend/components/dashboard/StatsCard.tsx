'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
}

export function StatsCard({ label, value, icon, helper }: StatsCardProps) {
  return (
    <Card padding="md" hover>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {value}
          </p>
        </div>
        {icon && <div className="text-primary-500">{icon}</div>}
      </div>
      {helper && <p className="text-xs text-slate-500 mt-2">{helper}</p>}
    </Card>
  );
}

export default StatsCard;
