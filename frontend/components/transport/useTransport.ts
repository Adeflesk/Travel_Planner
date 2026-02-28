'use client';

import { useState, useCallback, useEffect } from 'react';
import { TripTransport, TripTransportCreate, TripTransportUpdate } from '@/lib/types';
import { transportApi } from '@/lib/api';

export function useTransport(tripId: number, dayId: number) {
  const [items, setItems] = useState<TripTransport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await transportApi.getByDayId(tripId, dayId);
      setItems(res.data);
    } catch (err) {
      console.error('Error loading transport:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId, dayId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTransport = async (data: TripTransportCreate) => {
    await transportApi.create(tripId, data);
    await load();
  };

  const updateTransport = async (id: number, data: TripTransportUpdate) => {
    await transportApi.update(id, data);
    await load();
  };

  const deleteTransport = async (id: number) => {
    await transportApi.delete(id);
    await load();
  };

  return { items, loading, reload: load, createTransport, updateTransport, deleteTransport };
}
