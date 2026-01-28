'use client';

import { Activity, Destination } from '@/lib/types';
import { MapPin } from 'lucide-react';
import { ActivityRow } from './ActivityRow';

interface DestinationActivitiesSectionProps {
  destination: Destination;
  activities: Activity[];
  onToggleComplete: (activity: Activity) => void;
  onDelete: (id: number) => void;
}

export function DestinationActivitiesSection({
  destination,
  activities,
  onToggleComplete,
  onDelete,
}: DestinationActivitiesSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Destination Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-800">{destination.name}</h3>
          {destination.country && (
            <span className="text-sm text-gray-500">({destination.country})</span>
          )}
          <span className="ml-auto text-sm text-gray-500">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      </div>

      {/* Activities List */}
      <div className="divide-y divide-gray-100">
        {activities.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500 italic">
            No activities for this destination
          </p>
        ) : (
          activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
