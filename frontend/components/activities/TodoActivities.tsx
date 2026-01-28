'use client';

import { Activity } from '@/lib/types';
import { ListTodo } from 'lucide-react';
import { ActivityItem } from './ActivityItem';

interface TodoActivitiesProps {
  activities: Activity[];
  completedCount: number;
  onEdit: (activity: Activity) => void;
  onDelete: (id: number) => void;
  onToggleCompleted: (activity: Activity) => void;
}

export function TodoActivities({
  activities,
  completedCount,
  onEdit,
  onDelete,
  onToggleCompleted,
}: TodoActivitiesProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <ListTodo className="w-5 h-5 text-green-600" />
        <span>Todo Checklist</span>
        <span className="text-sm text-gray-500">
          ({completedCount}/{activities.length} completed)
        </span>
      </h4>
      <div className="space-y-2">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleCompleted={onToggleCompleted}
            isTodo
          />
        ))}
      </div>
    </div>
  );
}
