'use client';

import { Activity } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit2, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ActivityItemProps {
  activity: Activity;
  onEdit: (activity: Activity) => void;
  onDelete: (id: number) => void;
  onToggleCompleted?: (activity: Activity) => void;
  isTodo?: boolean;
}

export function ActivityItem({
  activity,
  onEdit,
  onDelete,
  onToggleCompleted,
  isTodo = false,
}: ActivityItemProps) {
  if (isTodo) {
    return (
      <div
        className={`flex items-center justify-between p-3 border rounded-lg transition ${
          activity.is_completed
            ? 'bg-green-50 border-green-200'
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => onToggleCompleted?.(activity)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
            aria-label={activity.is_completed ? 'Mark activity incomplete' : 'Mark activity complete'}
          >
            {activity.is_completed ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          <div className="flex-1">
            <p
              className={`font-medium ${
                activity.is_completed
                  ? 'line-through text-gray-500'
                  : 'text-gray-800'
              }`}
            >
              {activity.name}
            </p>
            {activity.description && !activity.is_completed && (
              <p className="text-sm text-gray-600 mt-0.5">
                {activity.description}
              </p>
            )}
          </div>
        </div>
        <ActionButtons activity={activity} onEdit={onEdit} onDelete={onDelete} />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start border border-gray-200 p-3 rounded-lg bg-white hover:bg-gray-50 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-800">{activity.name}</p>
          <Badge
            variant={activity.status === 'booked' ? 'success' : activity.status === 'completed' ? 'default' : 'info'}
            size="sm"
          >
            {activity.status}
          </Badge>
        </div>
        {activity.description && (
          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
        )}
        {activity.scheduled_date && (
          <p className="text-xs text-gray-500 mt-1">
            {format(new Date(activity.scheduled_date), 'MMM dd, yyyy')}
          </p>
        )}
      </div>
      <ActionButtons activity={activity} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function ActionButtons({
  activity,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  onEdit: (activity: Activity) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex gap-1 ml-2">
      <button
        onClick={() => onEdit(activity)}
        className="text-blue-600 hover:text-blue-700 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        aria-label="Edit activity"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(activity.id)}
        className="text-red-600 hover:text-red-700 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        aria-label="Delete activity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
