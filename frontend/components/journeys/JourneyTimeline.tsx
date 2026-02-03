'use client';

import { format } from 'date-fns';
import { MapPin, Sparkles, Utensils, Camera, Bed, Fuel, ShoppingBag, Clock } from 'lucide-react';
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
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <MapPin className="h-4 w-4" />
      </div>
      <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">{stop.name}</p>
            {stop.location && (
              <p className="text-sm text-slate-500">{stop.location}</p>
            )}
          </div>
          <Badge variant="secondary" size="sm">
            Stop
          </Badge>
        </div>
        {(arrival || departure) && (
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
            {arrival && (
              <span>
                <span className="font-medium">Arrive:</span> {formatTime(arrival)}
              </span>
            )}
            {departure && (
              <span>
                <span className="font-medium">Depart:</span> {formatTime(departure)}
              </span>
            )}
          </div>
        )}
        {stop.notes && <p className="mt-2 text-sm text-slate-500">{stop.notes}</p>}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: JourneyTimelineActivity }) {
  const Icon = optionIcons[activity.option_type] || Clock;
  return (
    <div className="ml-11 flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">{activity.name}</p>
            {activity.description && (
              <p className="text-sm text-slate-500">{activity.description}</p>
            )}
          </div>
          <Badge
            variant={activity.status === 'done' ? 'success' : activity.status === 'selected' ? 'info' : 'default'}
            size="sm"
          >
            {activity.status}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
          {activity.estimated_duration && (
            <span>
              <span className="font-medium">Duration:</span> {activity.estimated_duration}m
            </span>
          )}
          {activity.estimated_cost !== undefined && (
            <span>
              <span className="font-medium">Cost:</span> {activity.estimated_cost} {activity.currency}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function JourneyTimeline({ journeyId }: JourneyTimelineProps) {
  const { data, loading, error } = useJourneyTimeline(journeyId);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading journey timeline...</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-slate-500">No journey timeline available.</p>;
  }

  if (data.items.length === 0) {
    return <p className="text-sm text-slate-500">No stops added yet.</p>;
  }

  return (
    <div className="space-y-4">
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
