'use client';

import { Activity } from '@/lib/types';
import { Calendar } from 'lucide-react';
import { ActivityItem } from './ActivityItem';

interface ScheduledActivitiesProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: number) => void;
}

export function ScheduledActivities({
  activities,
  onEdit,
  onDelete,
}: ScheduledActivitiesProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <span>Scheduled Activities</span>
        <span className="text-sm text-gray-500">({activities.length})</span>
      </h4>
      <div className="space-y-2">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
