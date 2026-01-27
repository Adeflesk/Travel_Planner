// components/TripTimeline.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Journey, Destination } from '@/lib/types';
import { journeyApi, destinationApi } from '@/lib/api';
import { format } from 'date-fns';
import { MapPin, Plane, Train, Bus, Car, Ship, Footprints, ArrowDown, Calendar } from 'lucide-react';

interface TripTimelineProps {
  tripId: number;
}

type TimelineItem =
  | { type: 'destination'; data: Destination; sortDate: Date }
  | { type: 'journey'; data: Journey; sortDate: Date };

const transportIcons: Record<string, typeof Plane> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  car: Car,
  ferry: Ship,
  walk: Footprints,
};

export default function TripTimeline({ tripId }: TripTimelineProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [destResponse, journeyResponse] = await Promise.all([
        destinationApi.getByTripId(tripId),
        journeyApi.getByTripId(tripId),
      ]);
      setDestinations(destResponse.data);
      setJourneys(journeyResponse.data);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build timeline items sorted by date
  const buildTimeline = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Add destinations with their arrival dates
    destinations.forEach((dest) => {
      const sortDate = dest.arrival_date
        ? new Date(dest.arrival_date)
        : new Date(0); // Put undated items at the beginning
      items.push({ type: 'destination', data: dest, sortDate });
    });

    // Add journeys with their departure dates
    journeys.forEach((journey) => {
      const sortDate = journey.departure_datetime
        ? new Date(journey.departure_datetime)
        : new Date(0);
      items.push({ type: 'journey', data: journey, sortDate });
    });

    // Sort by date
    items.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    return items;
  };

  const getTransportIcon = (mode: string) => {
    const Icon = transportIcons[mode] || Plane;
    return <Icon className="w-5 h-5" />;
  };

  const getDestinationName = (destId?: number) => {
    if (!destId) return 'Unknown';
    const dest = destinations.find((d) => d.id === destId);
    return dest ? dest.name : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const timeline = buildTimeline();

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
        {timeline.map((item, index) => (
          <div key={`${item.type}-${item.type === 'destination' ? item.data.id : item.data.id}`}>
            {item.type === 'destination' ? (
              // Destination Card
              <div className="relative flex items-start gap-4 pb-8">
                {/* Timeline node */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full text-white shadow-lg">
                  <MapPin className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {item.data.name}
                        {item.data.country && (
                          <span className="text-gray-500 font-normal">, {item.data.country}</span>
                        )}
                      </h3>
                      {item.data.region && (
                        <p className="text-sm text-gray-500">{item.data.region}</p>
                      )}
                    </div>
                  </div>

                  {(item.data.arrival_date || item.data.departure_date) && (
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {item.data.arrival_date && (
                        <span>
                          Arrive: {format(new Date(item.data.arrival_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                      {item.data.arrival_date && item.data.departure_date && (
                        <span className="text-gray-300">|</span>
                      )}
                      {item.data.departure_date && (
                        <span>
                          Depart: {format(new Date(item.data.departure_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Journey Card
              <div className="relative flex items-start gap-4 pb-8">
                {/* Timeline node */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 ${getStatusColor(item.data.status)} rounded-full text-white shadow-lg`}>
                  {getTransportIcon(item.data.transport_mode)}
                </div>

                {/* Content */}
                <div className="flex-1 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-700">
                      {getDestinationName(item.data.origin_id)}
                    </span>
                    <ArrowDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
                    <span className="font-medium text-gray-700">
                      {getDestinationName(item.data.destination_id)}
                    </span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.data.status === 'booked'
                        ? 'bg-green-100 text-green-800'
                        : item.data.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.data.status.charAt(0).toUpperCase() + item.data.status.slice(1)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {item.data.carrier && (
                      <p><span className="font-medium">Carrier:</span> {item.data.carrier}</p>
                    )}
                    <div className="flex flex-wrap gap-4">
                      {item.data.departure_datetime && (
                        <span>
                          <span className="font-medium">Departs:</span>{' '}
                          {format(new Date(item.data.departure_datetime), 'MMM dd, HH:mm')}
                        </span>
                      )}
                      {item.data.arrival_datetime && (
                        <span>
                          <span className="font-medium">Arrives:</span>{' '}
                          {format(new Date(item.data.arrival_datetime), 'MMM dd, HH:mm')}
                        </span>
                      )}
                    </div>
                    {item.data.booking_reference && (
                      <p><span className="font-medium">Ref:</span> {item.data.booking_reference}</p>
                    )}
                    {item.data.cost && (
                      <p><span className="font-medium">Cost:</span> ${Number(item.data.cost).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
