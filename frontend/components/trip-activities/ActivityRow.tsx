'use client';

import { Activity } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ActivityRowProps {
  activity: Activity;
  onToggleComplete: (activity: Activity) => void;
  onDelete: (id: number) => void;
}

export function ActivityRow({
  activity,
  onToggleComplete,
  onDelete,
}: ActivityRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${
        activity.is_completed ? 'bg-green-50' : ''
      }`}
    >
      <button
        onClick={() => onToggleComplete(activity)}
        className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        aria-label={activity.is_completed ? 'Mark activity incomplete' : 'Mark activity complete'}
      >
        {activity.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`font-medium ${
              activity.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {activity.name}
          </p>
          <Badge
            variant={activity.status === 'booked' ? 'success' : activity.status === 'completed' ? 'default' : 'info'}
            size="sm"
          >
            {activity.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {activity.activity_type && (
            <span className="capitalize">{activity.activity_type}</span>
          )}
          {activity.scheduled_date && (
            <>
              {activity.activity_type && <span>•</span>}
              <span>{format(new Date(activity.scheduled_date), 'MMM dd, yyyy')}</span>
            </>
          )}
          {activity.is_todo && (
            <>
              <span>•</span>
              <span className="text-orange-600">To-do</span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(activity.id)}
        className="text-red-600 hover:text-red-700 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        aria-label="Delete activity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
