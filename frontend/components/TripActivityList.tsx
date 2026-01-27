// components/TripActivityList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Destination } from '@/lib/types';
import { activityApi, destinationApi } from '@/lib/api';
import { format } from 'date-fns';
import { Trash2, Edit2, CheckCircle2, Circle, MapPin } from 'lucide-react';

interface TripActivityListProps {
  tripId: number;
}

interface DestinationWithActivities {
  destination: Destination;
  activities: Activity[];
}

export default function TripActivityList({ tripId }: TripActivityListProps) {
  const [destinationsWithActivities, setDestinationsWithActivities] = useState<DestinationWithActivities[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    try {
      // First, get all destinations for the trip
      const destResponse = await destinationApi.getByTripId(tripId);
      const destinations = destResponse.data;

      // Then, get activities for each destination
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

  const handleToggleComplete = async (activity: Activity) => {
    try {
      await activityApi.update(activity.id, {
        is_completed: !activity.is_completed,
      });
      loadActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this activity?')) {
      try {
        await activityApi.delete(id);
        loadActivities();
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
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

  if (loading) {
    return <p className="text-center text-gray-500">Loading activities...</p>;
  }

  if (destinationsWithActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">No destinations yet</p>
        <p className="text-sm text-gray-400">
          Add destinations first, then you can add activities to each destination.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Activities Progress</p>
            <p className="text-3xl font-bold">
              {completedActivities} / {totalActivities}
            </p>
            <p className="text-purple-200 text-sm mt-1">
              {totalActivities > 0
                ? `${Math.round((completedActivities / totalActivities) * 100)}% completed`
                : 'No activities yet'}
            </p>
          </div>
          <CheckCircle2 className="w-12 h-12 text-purple-200" />
        </div>
      </div>

      {/* Activities by Destination */}
      <div className="space-y-6">
        {destinationsWithActivities.map(({ destination, activities }) => (
          <div key={destination.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Destination Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-800">{destination.name}</h3>
                {destination.country && (
                  <span className="text-sm text-gray-500">({destination.country})</span>
                )}
                <span className="ml-auto text-sm text-gray-500">
                  {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>
            </div>

            {/* Activities List */}
            <div className="divide-y divide-gray-100">
              {activities.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500 italic">
                  No activities for this destination
                </p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${
                      activity.is_completed ? 'bg-green-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleToggleComplete(activity)}
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
                      onClick={() => handleDelete(activity.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        To add activities, go to the Destinations tab and add them to each destination.
      </p>
    </div>
  );
}
