'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity } from '@/lib/types';
import { activityApi } from '@/lib/api';

export function useActivities(destinationId: number) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const response = await activityApi.getByDestinationId(destinationId);
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const scheduled = activities.filter((a) => !a.is_todo);
  const todos = activities.filter((a) => a.is_todo);
  const completedCount = todos.filter((a) => a.is_completed).length;

  const toggleCompleted = async (activity: Activity) => {
    try {
      await activityApi.update(activity.id, {
        is_completed: !activity.is_completed,
      });
      reload();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const deleteActivity = async (id: number) => {
    if (confirm('Delete this activity?')) {
      try {
        await activityApi.delete(id);
        reload();
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  return {
    activities,
    scheduled,
    todos,
    completedCount,
    loading,
    reload,
    toggleCompleted,
    deleteActivity,
  };
}
