'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, TripProgress, DestinationWithActivities } from '@/lib/types';
import { activityApi, tripApi } from '@/lib/api';

export type { DestinationWithActivities };

const defaultProgress: TripProgress = {
  total_activities: 0,
  completed_activities: 0,
  progress_percent: 0,
};

export function useTripActivities(tripId: number) {
  const [destinationsWithActivities, setDestinationsWithActivities] = useState<
    DestinationWithActivities[]
  >([]);
  const [progress, setProgress] = useState<TripProgress>(defaultProgress);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    try {
      const [dataRes, progressRes] = await Promise.all([
        tripApi.getDestinationsWithActivities(tripId),
        tripApi.getProgress(tripId),
      ]);
      setDestinationsWithActivities(dataRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const toggleComplete = async (activity: Activity) => {
    try {
      await activityApi.update(activity.id, {
        is_completed: !activity.is_completed,
      });
      loadActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const deleteActivity = async (id: number) => {
    try {
      await activityApi.delete(id);
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  return {
    destinationsWithActivities,
    loading,
    totalActivities: progress.total_activities,
    completedActivities: progress.completed_activities,
    progressPercent: progress.progress_percent,
    toggleComplete,
    deleteActivity,
  };
}
