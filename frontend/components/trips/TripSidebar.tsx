'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CloudSun, MapPin, Package, Route } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { destinationApi, packingApi } from '@/lib/api';
import { Destination, PackingSummary, Trip } from '@/lib/types';
import { useTripStats } from '@/components/trips/useTripStats';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface TripSidebarProps {
  tripId: number;
  trip?: Trip | null;
}

function TripStatsCard({ tripId }: TripSidebarProps) {
  const { stats, loading, error } = useTripStats(tripId);

  if (loading) {
    return (
      <Card padding="md" className="animate-pulse">
        <div className="h-4 w-1/3 bg-slate-200 rounded mb-4"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card padding="md">
        <p className="text-sm text-slate-500">Trip stats unavailable.</p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-4">
        <Route className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-slate-900">Trip Stats</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Days Until</p>
          <p className="font-semibold text-slate-900">
            {stats.days_until_departure ?? '--'}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Duration</p>
          <p className="font-semibold text-slate-900">{stats.duration_days} days</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Completion</p>
          <p className="font-semibold text-slate-900">
            {stats.completion_percentage.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Journeys</p>
          <p className="font-semibold text-slate-900">
            {stats.booked_journeys}/{stats.total_journeys}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Destinations</p>
          <p className="font-semibold text-slate-900">{stats.counts.destinations}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Activities</p>
          <p className="font-semibold text-slate-900">{stats.counts.activities}</p>
        </div>
      </div>
    </Card>
  );
}

function PackingSummaryCard({ tripId }: TripSidebarProps) {
  const [summary, setSummary] = useState<PackingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPacking = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await packingApi.getSummary(tripId);
        setSummary(response.data);
      } catch (err) {
        console.error('Error loading packing summary:', err);
        setError('Failed to load packing summary');
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadPacking();
  }, [tripId]);

  if (loading) {
    return (
      <Card padding="md" className="animate-pulse">
        <div className="h-4 w-1/3 bg-slate-200 rounded mb-4"></div>
        <div className="h-2 bg-slate-200 rounded mb-2"></div>
        <div className="h-2 bg-slate-200 rounded w-2/3"></div>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card padding="md">
        <p className="text-sm text-slate-500">Packing summary unavailable.</p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-900">Packing</h3>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {summary.packed_items}/{summary.total_items} packed
        </span>
        <span className="tabular-nums">{summary.progress_percent}%</span>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={summary.progress_percent}
          size="sm"
          variant={summary.progress_percent >= 80 ? 'success' : 'info'}
          showLabel={false}
        />
      </div>
    </Card>
  );
}

function TripDatesCard({ trip }: TripSidebarProps) {
  if (!trip) {
    return (
      <Card padding="md">
        <p className="text-sm text-slate-500">Trip dates unavailable.</p>
      </Card>
    );
  }

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const daysUntil = differenceInDays(startDate, new Date());
  const duration = Math.max(differenceInDays(endDate, startDate) + 1, 0);

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-slate-900">Dates</h3>
      </div>
      <div className="text-sm text-slate-600 space-y-2">
        <div className="flex items-center justify-between">
          <span>Start</span>
          <span className="font-medium text-slate-900">
            {format(startDate, 'MMM dd, yyyy')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>End</span>
          <span className="font-medium text-slate-900">
            {format(endDate, 'MMM dd, yyyy')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Duration</span>
          <span className="font-medium text-slate-900">{duration} days</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Starts In</span>
          <span className="font-medium text-slate-900">
            {Number.isNaN(daysUntil) ? '--' : `${daysUntil} days`}
          </span>
        </div>
      </div>
    </Card>
  );
}

function DestinationsCard({ tripId }: TripSidebarProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDestinations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await destinationApi.getByTripId(tripId);
        setDestinations(response.data || []);
      } catch (err) {
        console.error('Error loading destinations:', err);
        setError('Failed to load destinations');
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    };

    loadDestinations();
  }, [tripId]);

  const summary = useMemo(() => destinations.slice(0, 4), [destinations]);

  if (loading) {
    return (
      <Card padding="md" className="animate-pulse">
        <div className="h-4 w-1/3 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-2 bg-slate-200 rounded"></div>
          <div className="h-2 bg-slate-200 rounded w-5/6"></div>
          <div className="h-2 bg-slate-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md">
        <p className="text-sm text-slate-500">Destinations unavailable.</p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-slate-900">Destinations</h3>
      </div>
      {destinations.length === 0 ? (
        <p className="text-sm text-slate-500">No destinations added yet.</p>
      ) : (
        <div className="space-y-2 text-sm text-slate-600">
          {summary.map((destination) => (
            <div key={destination.id} className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{destination.name}</span>
              {destination.country && (
                <span className="text-xs text-slate-500">{destination.country}</span>
              )}
            </div>
          ))}
          {destinations.length > summary.length && (
            <p className="text-xs text-slate-500">
              +{destinations.length - summary.length} more
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function WeatherPreviewCard() {
  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-2">
        <CloudSun className="w-4 h-4 text-sky-500" />
        <h3 className="text-sm font-semibold text-slate-900">Weather Preview</h3>
      </div>
      <p className="text-sm text-slate-600">
        Weather forecasts will appear here once destination weather is enabled.
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays className="w-3.5 h-3.5" />
        <span>Based on trip dates</span>
      </div>
    </Card>
  );
}

export function TripSidebar({ tripId, trip }: TripSidebarProps) {
  return (
    <aside className="space-y-4">
      <TripDatesCard trip={trip} tripId={tripId} />
      <TripStatsCard tripId={tripId} />
      <PackingSummaryCard tripId={tripId} />
      <DestinationsCard tripId={tripId} />
      <WeatherPreviewCard />
    </aside>
  );
}

export default TripSidebar;
