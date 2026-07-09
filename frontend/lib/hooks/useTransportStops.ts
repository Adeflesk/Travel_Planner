import { useState, useEffect, useCallback } from 'react';
import { TransportStop, TransportStopCreate, TransportStopUpdate, ScheduleResponse } from '../types';
import { transportStopApi } from '../api';
import { AxiosError } from 'axios';

export const useTransportStops = (transportId: number | null, departureTime?: string, dayDate?: string, dayEndTarget?: string) => {
  const [stops, setStops] = useState<TransportStop[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStops = useCallback(async () => {
    if (!transportId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await transportStopApi.list(transportId);
      setStops(res.data);
    } catch (err: unknown) {
      console.error('Error fetching stops:', err);
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Failed to fetch transport stops');
      } else {
        setError('Failed to fetch transport stops');
      }
    } finally {
      setLoading(false);
    }
  }, [transportId]);

  const fetchSchedule = useCallback(async () => {
    if (!transportId || !departureTime || !dayDate) {
      setSchedule(null);
      return;
    }
    setScheduleLoading(true);
    try {
      const res = await transportStopApi.getSchedule(transportId, {
        departure_time: departureTime,
        day_date: dayDate,
        day_end_target: dayEndTarget || undefined,
      });
      setSchedule(res.data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    } finally {
      setScheduleLoading(false);
    }
  }, [transportId, departureTime, dayDate, dayEndTarget]);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule, stops]); // Refetch schedule whenever stops mutate or input parameters change

  const createStop = async (data: TransportStopCreate) => {
    if (!transportId) return null;
    setError(null);
    try {
      const res = await transportStopApi.create(transportId, data);
      setStops((prev) => [...prev, res.data].sort((a, b) => a.sort_order - b.sort_order));
      return res.data;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Failed to create transport stop');
      } else {
        setError('Failed to create transport stop');
      }
      throw err;
    }
  };

  const updateStop = async (stopId: number, data: TransportStopUpdate) => {
    if (!transportId) return null;
    setError(null);
    try {
      const res = await transportStopApi.update(transportId, stopId, data);
      setStops((prev) =>
        prev
          .map((s) => (s.id === stopId ? res.data : s))
          .sort((a, b) => a.sort_order - b.sort_order)
      );
      return res.data;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Failed to update transport stop');
      } else {
        setError('Failed to update transport stop');
      }
      throw err;
    }
  };

  const deleteStop = async (stopId: number) => {
    if (!transportId) return;
    setError(null);
    try {
      await transportStopApi.delete(transportId, stopId);
      setStops((prev) => prev.filter((s) => s.id !== stopId));
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Failed to delete transport stop');
      } else {
        setError('Failed to delete transport stop');
      }
      throw err;
    }
  };

  const reorderStops = async (newOrder: { id: number; sort_order: number }[]) => {
    if (!transportId) return;
    setError(null);
    // Optimistic UI update
    const idToOrder = new Map(newOrder.map((x) => [x.id, x.sort_order]));
    const optimistic = [...stops]
      .map((s) => ({ ...s, sort_order: idToOrder.has(s.id) ? idToOrder.get(s.id)! : s.sort_order }))
      .sort((a, b) => a.sort_order - b.sort_order);
    setStops(optimistic);

    try {
      const res = await transportStopApi.reorder(transportId, newOrder);
      setStops(res.data);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Failed to reorder transport stops');
      } else {
        setError('Failed to reorder transport stops');
      }
      fetchStops(); // Rollback on failure
    }
  };

  return {
    stops,
    schedule,
    loading,
    scheduleLoading,
    error,
    reload: fetchStops,
    reloadSchedule: fetchSchedule,
    createStop,
    updateStop,
    deleteStop,
    reorderStops,
  };
};
