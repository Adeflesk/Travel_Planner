'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Journey, Destination } from '@/lib/types';
import { journeyApi, destinationApi } from '@/lib/api';
import { Plane, Train, Bus, Car, Ship, Footprints } from 'lucide-react';

export type SortOption =
  | 'departure_asc'
  | 'departure_desc'
  | 'status'
  | 'transport_mode';

export const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'departure_asc', label: 'Departure (Earliest)' },
  { value: 'departure_desc', label: 'Departure (Latest)' },
  { value: 'status', label: 'Status' },
  { value: 'transport_mode', label: 'Transport Mode' },
];

const SORT_STORAGE_KEY = 'journey_sort_preference';

export const transportModes = [
  { value: 'flight', label: 'Flight', icon: Plane },
  { value: 'train', label: 'Train', icon: Train },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'car', label: 'Car', icon: Car },
  { value: 'ferry', label: 'Ferry', icon: Ship },
  { value: 'walk', label: 'Walk', icon: Footprints },
];

export const getTransportIcon = (mode: string) => {
  const transport = transportModes.find((t) => t.value === mode);
  return transport ? transport.icon : Plane;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'booked':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

// Status order for sorting
const statusOrder: Record<string, number> = {
  planned: 0,
  booked: 1,
  completed: 2,
};

export function useJourneys(tripId: number) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved && sortOptions.some((opt) => opt.value === saved)) {
        return saved as SortOption;
      }
    }
    return 'departure_asc';
  });

  // Persist sort preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SORT_STORAGE_KEY, sortOption);
    }
  }, [sortOption]);

  // Sort journeys based on selected option
  const sortedJourneys = useMemo(() => {
    const sorted = [...journeys];
    switch (sortOption) {
      case 'departure_asc':
        return sorted.sort((a, b) => {
          if (!a.departure_datetime && !b.departure_datetime) return 0;
          if (!a.departure_datetime) return 1;
          if (!b.departure_datetime) return -1;
          return new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime();
        });
      case 'departure_desc':
        return sorted.sort((a, b) => {
          if (!a.departure_datetime && !b.departure_datetime) return 0;
          if (!a.departure_datetime) return 1;
          if (!b.departure_datetime) return -1;
          return new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime();
        });
      case 'status':
        return sorted.sort((a, b) => {
          const orderA = statusOrder[a.status] ?? 99;
          const orderB = statusOrder[b.status] ?? 99;
          return orderA - orderB;
        });
      case 'transport_mode':
        return sorted.sort((a, b) => a.transport_mode.localeCompare(b.transport_mode));
      default:
        return sorted;
    }
  }, [journeys, sortOption]);

  const loadData = useCallback(async () => {
    try {
      const [journeysResponse, destinationsResponse] = await Promise.all([
        journeyApi.getByTripId(tripId),
        destinationApi.getByTripId(tripId),
      ]);
      setJourneys(journeysResponse.data);
      setDestinations(destinationsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deleteJourney = async (id: number) => {
    try {
      await journeyApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting journey:', error);
    }
  };

  const getDestinationName = (destId?: number) => {
    if (!destId) return 'Unknown';
    const dest = destinations.find((d) => d.id === destId);
    return dest ? dest.name : 'Unknown';
  };

  return {
    journeys: sortedJourneys,
    destinations,
    loading,
    reload: loadData,
    deleteJourney,
    getDestinationName,
    sortOption,
    setSortOption,
  };
}
