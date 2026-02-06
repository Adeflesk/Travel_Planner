'use client';

import { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  // Status variants
  | 'planned'
  | 'booked'
  | 'active'
  | 'completed'
  | 'cancelled';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-secondary-100 text-secondary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  // Status variants
  planned: 'bg-blue-100 text-blue-700',
  booked: 'bg-emerald-100 text-emerald-700',
  active: 'bg-orange-100 text-orange-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  children,
  className = '',
}: BadgeProps) {
  const classes = [
    'inline-flex items-center gap-1 font-medium rounded-full',
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {icon && <span className="w-3 h-3">{icon}</span>}
      {children}
    </span>
  );
}

// Convenience components for common statuses
export function StatusBadge({
  status,
  className = '',
}: {
  status: 'planned' | 'booked' | 'active' | 'completed' | 'cancelled' | 'ongoing' | 'planning';
  className?: string;
}) {
  // Map status to variant
  const variantMap: Record<string, BadgeVariant> = {
    planned: 'planned',
    planning: 'planned',
    booked: 'booked',
    active: 'active',
    ongoing: 'active',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  const labels: Record<string, string> = {
    planned: 'Planned',
    planning: 'Planning',
    booked: 'Booked',
    active: 'In Progress',
    ongoing: 'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <Badge variant={variantMap[status] || 'default'} className={className}>
      {labels[status] || status}
    </Badge>
  );
}

export default Badge;
