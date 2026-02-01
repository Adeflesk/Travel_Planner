'use client';

import { useTimeline } from './useTimeline';
import { TimelineDestination } from './TimelineDestination';
import { TimelineJourney } from './TimelineJourney';
import { TimelineAccommodation } from './TimelineAccommodation';

interface TripTimelineProps {
  tripId: number;
}

export default function TripTimeline({ tripId }: TripTimelineProps) {
  const {
    timeline,
    loading,
    getDestinationName,
    getStatusColor,
  } = useTimeline(tripId);

  if (loading) {
    return <p className="text-center text-gray-500 py-8">Loading timeline...</p>;
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">No timeline data yet</p>
        <p className="text-sm text-gray-400">
          Add destinations and journeys to see your trip timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-0">
        {timeline.map((item) => (
          <div key={`${item.type}-${item.data.id}`}>
            {item.type === 'destination' ? (
              <TimelineDestination destination={item.data} />
            ) : item.type === 'journey' ? (
              <TimelineJourney
                journey={item.data}
                getDestinationName={getDestinationName}
                getStatusColor={getStatusColor}
              />
            ) : (
              <TimelineAccommodation accommodation={item.data} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
