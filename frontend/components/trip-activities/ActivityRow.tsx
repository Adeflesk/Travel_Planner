'use client';

import { Activity } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, CheckCircle2, Circle } from 'lucide-react';

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
        className="flex-shrink-0"
      >
        {activity.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${
            activity.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {activity.name}
        </p>
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
        className="text-red-600 hover:text-red-700 p-1"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
