'use client';

import { useState, useCallback } from 'react';
import { Accommodation, AccommodationCreate, AccommodationUpdate } from '@/lib/types';
import { accommodationApi } from '@/lib/api';

export function useAccommodations(tripId: number, destinationId: number) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accommodationApi.getByDestination(tripId, destinationId);
      setAccommodations(res.data);
    } catch {
      setAccommodations([]);
    } finally {
      setLoading(false);
    }
  }, [tripId, destinationId]);

  const create = async (data: AccommodationCreate) => {
    await accommodationApi.create(tripId, destinationId, data);
    await load();
  };

  const update = async (id: number, data: AccommodationUpdate) => {
    await accommodationApi.update(tripId, destinationId, id, data);
    await load();
  };

  const remove = async (id: number) => {
    await accommodationApi.delete(tripId, destinationId, id);
    await load();
  };

  return { accommodations, loading, load, create, update, remove };
}
