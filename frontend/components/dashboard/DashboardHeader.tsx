'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function DashboardHeader({ title, subtitle, action }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
      </div>
      {action || (
        <Link href="/trips">
          <Button variant="primary">Plan a Trip</Button>
        </Link>
      )}
    </div>
  );
}

export default DashboardHeader;
