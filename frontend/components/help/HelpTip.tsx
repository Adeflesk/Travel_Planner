'use client';

import { ReactNode } from 'react';
import { Info, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

interface HelpTipProps {
  variant?: 'info' | 'tip' | 'warning' | 'success';
  children: ReactNode;
}

const variantStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    IconComponent: Info,
  },
  tip: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    IconComponent: Lightbulb,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    IconComponent: AlertTriangle,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    IconComponent: CheckCircle,
  },
};

export function HelpTip({ variant = 'info', children }: HelpTipProps) {
  const styles = variantStyles[variant];
  const IconComponent = styles.IconComponent;

  return (
    <div className={`border rounded-lg p-4 flex gap-3 my-4 ${styles.container}`}>
      <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}
