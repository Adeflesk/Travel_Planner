'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayActivity, Destination, DestinationWithActivities } from '@/lib/types';
import { dayApi, destinationApi } from '@/lib/api';

export type { DestinationWithActivities };

export function useTripActivities(tripId: number) {
  const [activities, setActivities] = useState<DayActivity[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [actsRes, destsRes] = await Promise.all([
        dayApi.getByTrip(tripId),
        destinationApi.getByTripId(tripId),
      ]);
      setActivities(actsRes.data);
      setDestinations(destsRes.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group activities by destination_id
  const destinationsWithActivities: DestinationWithActivities[] = destinations.map((dest) => ({
    destination: dest,
    activities: activities.filter((a) => a.destination_id === dest.id),
  }));

  const totalActivities = activities.length;
  const completedActivities = activities.filter((a) => a.is_completed).length;
  const progressPercent = totalActivities > 0
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  const toggleComplete = async (activity: DayActivity) => {
    try {
      await dayApi.updateActivity(activity.id, { is_completed: !activity.is_completed });
      loadData();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const deleteActivity = async (id: number) => {
    try {
      await dayApi.deleteActivity(id);
      loadData();
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

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
