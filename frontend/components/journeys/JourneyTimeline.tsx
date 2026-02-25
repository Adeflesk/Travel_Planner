'use client';

import { format } from 'date-fns';
import {
  MapPin,
  Sparkles,
  Utensils,
  Camera,
  Bed,
  Fuel,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { JourneyTimelineActivity, JourneyTimelineItem, JourneyTimelineStop } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { useJourneyTimeline } from './useJourneyTimeline';

interface JourneyTimelineProps {
  journeyId: number;
}

const optionIcons = {
  activity: Sparkles,
  meal: Utensils,
  sightseeing: Camera,
  rest: Bed,
  fuel: Fuel,
  shopping: ShoppingBag,
  other: Clock,
};

function formatTime(value?: string | null) {
  if (!value) return null;
  return format(new Date(value), 'MMM dd, HH:mm');
}

function StopRow({ stop }: { stop: JourneyTimelineStop }) {
  const arrival = stop.actual_arrival || stop.planned_arrival;
  const departure = stop.actual_departure || stop.planned_departure;

  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm flex-shrink-0">
        <MapPin className="h-4 w-4" />
      </div>
      <div className="flex-1 rounded-lg border-l-4 border-l-primary-400 border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">{stop.name}</p>
          <Badge variant="secondary" size="sm">
            Stop
          </Badge>
        </div>
        {stop.location && (
          <p className="text-sm text-slate-500 mt-0.5">{stop.location}</p>
        )}
        {(arrival || departure) && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {arrival && (
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Arrive
                </span>
                <span className="font-medium tabular-nums">{formatTime(arrival)}</span>
              </span>
            )}
            {arrival && departure && <span className="text-slate-200 select-none">|</span>}
            {departure && (
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Depart
                </span>
                <span className="font-medium tabular-nums">{formatTime(departure)}</span>
              </span>
            )}
          </div>
        )}
        {stop.notes && <p className="mt-2 text-sm text-slate-500 italic">{stop.notes}</p>}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: JourneyTimelineActivity }) {
  const Icon = optionIcons[activity.option_type] || Clock;

  return (
    <div className="ml-11 flex items-start gap-3">
      <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-slate-800 text-sm">{activity.name}</p>
            {activity.description && (
              <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
            )}
          </div>
          <Badge
            variant={
              activity.status === 'done'
                ? 'success'
                : activity.status === 'selected'
                ? 'info'
                : 'default'
            }
            size="sm"
          >
            {activity.status}
          </Badge>
        </div>
        {(activity.estimated_duration || activity.estimated_cost !== undefined) && (
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
            {activity.estimated_duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activity.estimated_duration}m
              </span>
            )}
            {activity.estimated_cost !== undefined && (
              <span className="font-semibold text-slate-600">
                {activity.estimated_cost} {activity.currency}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function JourneyTimeline({ journeyId }: JourneyTimelineProps) {
  const { data, loading, error } = useJourneyTimeline(journeyId);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 h-16 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-slate-500">No journey timeline available.</p>;
  }

  if (data.items.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No stops added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((item: JourneyTimelineItem) =>
        item.type === 'stop' ? (
          <StopRow key={`stop-${item.id}`} stop={item} />
        ) : (
          <ActivityRow key={`activity-${item.id}`} activity={item} />
        )
      )}
    </div>
  );
}

export default JourneyTimeline;
