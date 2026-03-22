'use client';

import Link from 'next/link';
import { Calendar, MapPin, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardData } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { BudgetProgressBar } from '@/components/ui/ProgressBar';

interface NextTripCardProps {
  nextTrip: DashboardData['next_trip'];
}

export function NextTripCard({ nextTrip }: NextTripCardProps) {
  if (!nextTrip) {
    return (
      <Card padding="lg" hover>
        <div className="flex items-center gap-3 text-slate-600">
          <Plane className="w-6 h-6 text-primary-500" />
          <div>
            <p className="text-sm text-slate-500">Next trip</p>
            <p className="font-semibold text-slate-800">No upcoming trips</p>
          </div>
        </div>
      </Card>
    );
  }

  const budgetTotal = nextTrip.budget_total || 0;
  const percentUsed =
    budgetTotal > 0 ? Math.min((nextTrip.budget_used / budgetTotal) * 100, 100) : 0;
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: nextTrip.budget_currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <Card padding="lg" hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Next trip</p>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            {nextTrip.name}
          </h2>
        </div>
        <Link
          href={`/trips/${nextTrip.id}`}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          View trip
        </Link>
      </div>

      <div className="mt-4 space-y-2 text-slate-600">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-primary-500" />
          <span>Starts {format(new Date(nextTrip.start_date), 'MMM dd, yyyy')}</span>
          <span className="text-slate-400">·</span>
          <span>{nextTrip.days_until} days away</span>
        </div>
        {nextTrip.destinations.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary-500" />
            <span>{nextTrip.destinations.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
          <span>Budget used</span>
          <span className="tabular-nums">
            {fmt(nextTrip.budget_used)} / {fmt(budgetTotal)}
          </span>
        </div>
        <BudgetProgressBar value={percentUsed} size="sm" showLabel={false} />
      </div>
    </Card>
  );
}

export default NextTripCard;
