'use client';

import { useState, useEffect, useCallback } from 'react';
import { TripDay, TripTransport } from '@/lib/types';
import { tripApi, transportApi } from '@/lib/api';

export function useTimeline(tripId: number) {
  const [days, setDays] = useState<TripDay[]>([]);
  const [transport, setTransport] = useState<TripTransport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [daysRes, transportRes] = await Promise.all([
        tripApi.getDays(tripId),
        transportApi.getByTripId(tripId),
      ]);

      // getDays already includes activities in day.activities
      setDays(daysRes.data);
      setTransport(transportRes.data);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get transport items for a specific day (departing or arriving)
  const getTransportForDay = (dayId: number): TripTransport[] =>
    transport.filter(
      t => t.departure_day_id === dayId || t.arrival_day_id === dayId
    );

  // Get unscheduled transport (no departure day)
  const getUnscheduledTransport = (): TripTransport[] =>
    transport.filter(t => t.departure_day_id == null);

  return { days, transport, loading, getTransportForDay, getUnscheduledTransport };
}
