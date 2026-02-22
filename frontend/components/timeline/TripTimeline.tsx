'use client';

import { useTimeline } from './useTimeline';
import { TimelineDestination } from './TimelineDestination';
import { TimelineJourney } from './TimelineJourney';
import { TimelineAccommodation } from './TimelineAccommodation';
import { MapPin } from 'lucide-react';

interface TripTimelineProps {
  tripId: number;
}

export default function TripTimeline({ tripId }: TripTimelineProps) {
  const { timeline, loading, getDestinationName, getStatusColor } = useTimeline(tripId);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
            <div
              className="flex-1 rounded-xl bg-slate-100"
              style={{ height: i === 0 ? '88px' : '64px' }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
          <MapPin className="w-7 h-7 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-600">No timeline data yet</p>
        <p className="text-sm text-slate-400 mt-1">
          Add destinations and journeys to see your trip timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline track */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none"
        style={{
          left: '20px',
          background:
            'linear-gradient(to bottom, #BFDBFE 0%, #CBD5E1 55%, transparent 100%)',
        }}
      />

      <div className="space-y-0">
        {timeline.map((item, index) => (
          <div
            key={`${item.type}-${item.data.id}`}
            className="animate-fade-in-up"
            style={{
              animationDelay: `${index * 70}ms`,
              animationFillMode: 'both',
            }}
          >
            {item.type === 'destination' ? (
              <TimelineDestination destination={item.data} />
            ) : item.type === 'journey' ? (
              <TimelineJourney
                journey={item.data}
                getDestinationName={getDestinationName}
                getStatusColor={getStatusColor}
                conflict={item.conflict}
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
