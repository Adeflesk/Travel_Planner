'use client';

import { useState, useCallback, useEffect } from 'react';
import { TripTransport, TripTransportCreate, TripTransportUpdate } from '@/lib/types';
import { transportApi } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode-utils';

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
    const res = await transportApi.create(tripId, data);
    await load();

    // Background geocoding — only geocode if coordinates not already provided
    const id = res.data.id;
    if (data.origin && data.origin_latitude == null) {
      geocodeAddress(data.origin).then(coords => {
        if (coords) {
          transportApi.update(id, { origin_latitude: coords.lat, origin_longitude: coords.lng })
            .catch(console.error);
        }
      });
    }
    if (data.destination && data.destination_latitude == null) {
      geocodeAddress(data.destination).then(coords => {
        if (coords) {
          transportApi.update(id, { destination_latitude: coords.lat, destination_longitude: coords.lng })
            .catch(console.error);
        }
      });
    }
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
