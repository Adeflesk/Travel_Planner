'use client';

import { useMemo } from 'react';
import { Calendar, Globe, MapPinned, Wallet } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useDashboard } from '@/components/dashboard';
import {
  DashboardHeader,
  NextTripCard,
  StatsCard,
  ActionItemsList,
  RecentTripsGrid,
} from '@/components/dashboard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

function DashboardContent() {
  const { data, loading, error } = useDashboard();

  const statsCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: 'Total Trips',
        value: data.stats.total_trips,
        icon: <MapPinned className="w-6 h-6" />,
        helper: 'All time',
      },
      {
        label: 'Countries Visited',
        value: data.stats.countries_visited,
        icon: <Globe className="w-6 h-6" />,
        helper: 'Unique destinations',
      },
      {
        label: 'Spent This Year',
        value: `$${data.stats.spent_this_year.toFixed(0)}`,
        icon: <Wallet className="w-6 h-6" />,
        helper: 'Year to date',
      },
      {
        label: 'Upcoming Trips',
        value: data.stats.upcoming_trips,
        icon: <Calendar className="w-6 h-6" />,
        helper: 'Planned ahead',
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-8" role="status" aria-live="polite">
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card padding="lg">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-2 w-2/3" />
            </Card>
            <Card padding="md">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} padding="md">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-7 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))}
          </div>

          <Card padding="md">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100">
        <div className="text-xl text-slate-600">Failed to load dashboard.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
        <DashboardHeader
          title={`Welcome back, ${data.user.name}`}
          subtitle="Here’s a snapshot of your upcoming travel plans."
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <NextTripCard nextTrip={data.next_trip} />
          <ActionItemsList items={data.action_items} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((card) => (
            <StatsCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              helper={card.helper}
            />
          ))}
        </div>

        <RecentTripsGrid trips={data.recent_trips} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
