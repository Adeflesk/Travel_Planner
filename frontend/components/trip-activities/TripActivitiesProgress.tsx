'use client';

import { CheckCircle2 } from 'lucide-react';

interface TripActivitiesProgressProps {
  completedActivities: number;
  totalActivities: number;
  progressPercent: number;
}

export function TripActivitiesProgress({
  completedActivities,
  totalActivities,
  progressPercent,
}: TripActivitiesProgressProps) {
  return (
    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-100 text-sm">Activities Progress</p>
          <p className="text-3xl font-bold">
            {completedActivities} / {totalActivities}
          </p>
          <p className="text-purple-200 text-sm mt-1">
            {totalActivities > 0
              ? `${progressPercent}% completed`
              : 'No activities yet'}
          </p>
        </div>
        <CheckCircle2 className="w-12 h-12 text-purple-200" />
      </div>
    </div>
  );
}
