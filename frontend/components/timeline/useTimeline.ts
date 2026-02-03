'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Journey,
  Destination,
  Expense,
  TimelineItem as ApiTimelineItem,
} from '@/lib/types';
import { tripApi, expenseApi } from '@/lib/api';
import { Plane, Train, Bus, Car, Ship, Footprints } from 'lucide-react';

export interface ConflictInfo {
  type: 'overlap' | 'gap';
  message: string;
  hours: number;
}

export type TimelineItem =
  | { type: 'destination'; data: Destination; sortDate: Date; conflict?: ConflictInfo }
  | { type: 'journey'; data: Journey; sortDate: Date; conflict?: ConflictInfo }
  | { type: 'accommodation'; data: Expense; sortDate: Date; conflict?: ConflictInfo };

const ACCOMMODATION_CATEGORIES = ['accommodation', 'lodging', 'hotel', 'hostel', 'airbnb'];
const GAP_THRESHOLD_HOURS = 24; // Warn if gap > 24 hours between journeys

function detectConflicts(items: TimelineItem[]): TimelineItem[] {
  const result: TimelineItem[] = [];
  let lastJourneyEnd: Date | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };

    // Only check conflicts for journeys with datetime info
    if (item.type === 'journey') {
      const journey = item.data as Journey;
      const departureTime = journey.departure_datetime
        ? new Date(journey.departure_datetime)
        : null;
      const arrivalTime = journey.arrival_datetime
        ? new Date(journey.arrival_datetime)
        : null;

      if (departureTime && lastJourneyEnd) {
        const timeDiffMs = departureTime.getTime() - lastJourneyEnd.getTime();
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

        if (timeDiffHours < 0) {
          // Overlap detected
          const overlapHours = Math.abs(timeDiffHours);
          item.conflict = {
            type: 'overlap',
            message: `Overlaps with previous journey by ${formatDuration(overlapHours)}`,
            hours: overlapHours,
          };
        } else if (timeDiffHours > GAP_THRESHOLD_HOURS) {
          // Large gap detected
          item.conflict = {
            type: 'gap',
            message: `${formatDuration(timeDiffHours)} gap before this journey`,
            hours: timeDiffHours,
          };
        }
      }

      // Update lastJourneyEnd for next iteration
      if (arrivalTime) {
        lastJourneyEnd = arrivalTime;
      } else if (departureTime) {
        // If no arrival time, estimate based on departure
        lastJourneyEnd = departureTime;
      }
    }

    result.push(item);
  }

  return result;
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  } else if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h} hour${h !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours}h`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

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
      const [timelineResponse, expensesResponse] = await Promise.all([
        tripApi.getTimeline(tripId),
        expenseApi.getByTripId(tripId),
      ]);

      // Transform API response to local TimelineItem format
      const items: TimelineItem[] = timelineResponse.data.map(
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

      // Filter and add accommodations
      const accommodations: TimelineItem[] = expensesResponse.data
        .filter((expense: Expense) =>
          ACCOMMODATION_CATEGORIES.includes(expense.category.toLowerCase())
        )
        .map((expense: Expense) => {
          const baseDate = expense.date ? new Date(expense.date) : new Date(0);
          baseDate.setHours(23, 59, 59, 999);
          return {
            type: 'accommodation' as const,
            data: expense,
            sortDate: baseDate,
          };
        });

      // Merge and sort all items by date
      const allItems = [...items, ...accommodations].sort(
        (a, b) => a.sortDate.getTime() - b.sortDate.getTime()
      );

      // Detect conflicts between consecutive journeys
      const itemsWithConflicts = detectConflicts(allItems);

      setTimeline(itemsWithConflicts);
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
