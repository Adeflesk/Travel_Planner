'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Journey,
  Destination,
  TimelineItem as ApiTimelineItem,
} from '@/lib/types';
import { tripApi } from '@/lib/api';
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
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const response = await tripApi.getTimeline(tripId);
      // Transform API response to local TimelineItem format
      const items: TimelineItem[] = response.data.map(
        (item: ApiTimelineItem) => {
          if (item.type === 'destination' && item.destination) {
            return {
              type: 'destination' as const,
              data: item.destination,
              sortDate: item.sort_date ? new Date(item.sort_date) : new Date(0),
            };
          } else {
            return {
              type: 'journey' as const,
              data: item.journey!,
              sortDate: item.sort_date ? new Date(item.sort_date) : new Date(0),
            };
          }
        }
      );
      setTimeline(items);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTransportIcon = (mode: string) => {
    return transportIcons[mode] || Plane;
  };

  const getDestinationName = (destId?: number) => {
    if (!destId) return 'Unknown';
    const dest = timeline.find(
      (item) => item.type === 'destination' && item.data.id === destId
    );
    return dest ? (dest.data as Destination).name : 'Unknown';
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

  return {
    timeline,
    loading,
    getTransportIcon,
    getDestinationName,
    getStatusColor,
  };
}
