'use client';

import { ReactNode, HTMLAttributes } from 'react';

interface HelpSectionProps extends HTMLAttributes<HTMLElement> {
  id: string;
  title: string;
  children: ReactNode;
}

export function HelpSection({ id, title, children, className = '', ...props }: HelpSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 mb-8 ${className}`}
      {...props}
    >
      <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
        {title}
      </h2>
      <div className="prose prose-slate max-w-none">
        {children}
      </div>
    </section>
  );
}
