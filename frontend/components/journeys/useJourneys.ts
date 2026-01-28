'use client';

import { useState, useEffect, useCallback } from 'react';
import { Journey, Destination } from '@/lib/types';
import { journeyApi, destinationApi } from '@/lib/api';
import { Plane, Train, Bus, Car, Ship, Footprints } from 'lucide-react';

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

export function useJourneys(tripId: number) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

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
    journeys,
    destinations,
    loading,
    reload: loadData,
    deleteJourney,
    getDestinationName,
  };
}
