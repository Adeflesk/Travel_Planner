'use client';

import { useTripActivities } from './useTripActivities';
import { TripActivitiesProgress } from './TripActivitiesProgress';
import { DestinationActivitiesSection } from './DestinationActivitiesSection';

interface TripActivityListProps {
  tripId: number;
}

export default function TripActivityList({ tripId }: TripActivityListProps) {
  const {
    destinationsWithActivities,
    loading,
    totalActivities,
    completedActivities,
    progressPercent,
    toggleComplete,
    deleteActivity,
  } = useTripActivities(tripId);

  const handleDelete = async (id: number) => {
    if (confirm('Delete this activity?')) {
      await deleteActivity(id);
    }
  };

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
      <TripActivitiesProgress
        completedActivities={completedActivities}
        totalActivities={totalActivities}
        progressPercent={progressPercent}
      />

      <div className="space-y-6">
        {destinationsWithActivities.map(({ destination, activities }) => (
          <DestinationActivitiesSection
            key={destination.id}
            destination={destination}
            activities={activities}
            onToggleComplete={toggleComplete}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        To add activities, go to the Destinations tab and add them to each destination.
      </p>
    </div>
  );
}
