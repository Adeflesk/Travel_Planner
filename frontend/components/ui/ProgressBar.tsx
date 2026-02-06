'use client';

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type ProgressSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-primary-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const trackSizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({
  value,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  animate = true,
  className = '',
}: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1 text-sm">
          {label && <span className="text-slate-700">{label}</span>}
          {showLabel && (
            <span className="text-slate-500 tabular-nums">{clampedValue.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-slate-200 rounded-full overflow-hidden ${trackSizeStyles[size]}`}
      >
        <div
          className={`${sizeStyles[size]} rounded-full ${variantStyles[variant]} ${
            animate ? 'transition-all duration-300' : ''
          }`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

// Budget-specific progress bar with automatic color coding
interface BudgetProgressBarProps {
  value: number; // Percentage used
  size?: ProgressSize;
  showLabel?: boolean;
  warningThreshold?: number;
  dangerThreshold?: number;
  className?: string;
}

export function BudgetProgressBar({
  value,
  size = 'md',
  showLabel = true,
  warningThreshold = 75,
  dangerThreshold = 90,
  className = '',
}: BudgetProgressBarProps) {
  // Determine variant based on value
  let variant: ProgressVariant = 'success';
  if (value > 100) {
    variant = 'danger';
  } else if (value >= dangerThreshold) {
    variant = 'danger';
  } else if (value >= warningThreshold) {
    variant = 'warning';
  }

  return (
    <ProgressBar
      value={Math.min(value, 100)}
      variant={variant}
      size={size}
      showLabel={showLabel}
      className={className}
    />
  );
}

export default ProgressBar;
