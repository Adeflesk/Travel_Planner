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

    // Background geocoding — sequenced to respect Nominatim's 1 req/sec ToS
    const id = res.data.id;
    const geocodeSequentially = async () => {
      if (data.origin && data.origin_latitude == null) {
        const coords = await geocodeAddress(data.origin).catch(() => null);
        if (coords) {
          await transportApi.update(id, { origin_latitude: coords.lat, origin_longitude: coords.lng })
            .catch(console.error);
        }
      }
      if (data.destination && data.destination_latitude == null) {
        // Wait 1 second between requests per Nominatim ToS
        await new Promise(resolve => setTimeout(resolve, 1100));
        const coords = await geocodeAddress(data.destination).catch(() => null);
        if (coords) {
          await transportApi.update(id, { destination_latitude: coords.lat, destination_longitude: coords.lng })
            .catch(console.error);
        }
      }
    };
    geocodeSequentially();
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
