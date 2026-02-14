'use client';

import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  action?: ReactNode;
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  const classes = [
    'bg-white border border-slate-200 rounded-lg shadow-sm',
    paddingStyles[padding],
    hover ? 'hover:shadow-md hover:border-slate-300 transition-all cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  action,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 ${className}`}
      {...props}
    >
      <div className="font-semibold text-slate-900">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Compound component exports
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
