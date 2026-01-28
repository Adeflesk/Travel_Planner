'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Destination } from '@/lib/types';
import { activityApi, destinationApi } from '@/lib/api';

export interface DestinationWithActivities {
  destination: Destination;
  activities: Activity[];
}

export function useTripActivities(tripId: number) {
  const [destinationsWithActivities, setDestinationsWithActivities] = useState<DestinationWithActivities[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    try {
      const destResponse = await destinationApi.getByTripId(tripId);
      const destinations = destResponse.data;

      const results: DestinationWithActivities[] = await Promise.all(
        destinations.map(async (destination: Destination) => {
          const actResponse = await activityApi.getByDestinationId(destination.id);
          return {
            destination,
            activities: actResponse.data,
          };
        })
      );

      setDestinationsWithActivities(results);
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

  const totalActivities = destinationsWithActivities.reduce(
    (sum, d) => sum + d.activities.length,
    0
  );

  const completedActivities = destinationsWithActivities.reduce(
    (sum, d) => sum + d.activities.filter((a) => a.is_completed).length,
    0
  );

  const progressPercent = totalActivities > 0
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  return {
    destinationsWithActivities,
    loading,
    totalActivities,
    completedActivities,
    progressPercent,
    toggleComplete,
    deleteActivity,
  };
}
