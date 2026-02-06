'use client';

import Link from 'next/link';
import { DashboardData } from '@/lib/types';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';

interface RecentTripsGridProps {
  trips: DashboardData['recent_trips'];
}

export function RecentTripsGrid({ trips }: RecentTripsGridProps) {
  return (
    <Card padding="md" hover>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent Trips</h3>
        <Link
          href="/trips"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          View all
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-4 text-slate-600">
          <div className="rounded-full bg-sky-50 p-2 text-sky-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-800">No trips yet</p>
            <p className="text-sm text-slate-500">
              Create your first trip to see it here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <div className="h-full rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                <p className="font-semibold text-slate-900">{trip.name}</p>
                <p className="text-xs text-slate-500 mt-1">{trip.dates}</p>
                <div className="mt-3">
                  <StatusBadge
                    status={trip.status === 'completed' ? 'completed' : 'ongoing'}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default RecentTripsGrid;
