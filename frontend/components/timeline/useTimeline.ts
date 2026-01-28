'use client';

import { useState, useEffect, useCallback } from 'react';
import { Journey, Destination } from '@/lib/types';
import { journeyApi, destinationApi } from '@/lib/api';
import { Plane, Train, Bus, Car, Ship, Footprints } from 'lucide-react';

export type TimelineItem =
  | { type: 'destination'; data: Destination; sortDate: Date }
  | { type: 'journey'; data: Journey; sortDate: Date };

export const transportIcons: Record<string, typeof Plane> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  car: Car,
  ferry: Ship,
  walk: Footprints,
};

export function useTimeline(tripId: number) {
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

  const buildTimeline = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    destinations.forEach((dest) => {
      const sortDate = dest.arrival_date
        ? new Date(dest.arrival_date)
        : new Date(0);
      items.push({ type: 'destination', data: dest, sortDate });
    });

    journeys.forEach((journey) => {
      const sortDate = journey.departure_datetime
        ? new Date(journey.departure_datetime)
        : new Date(0);
      items.push({ type: 'journey', data: journey, sortDate });
    });

    items.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    return items;
  };

  const getTransportIcon = (mode: string) => {
    return transportIcons[mode] || Plane;
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

  return {
    timeline,
    loading,
    getTransportIcon,
    getDestinationName,
    getStatusColor,
  };
}
