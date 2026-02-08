'use client';

import { useState, useEffect, useCallback } from 'react';
import { JourneyStop, StopOption, StopOptionStatus } from '@/lib/types';
import { journeyStopApi, stopOptionApi } from '@/lib/api';

export function useJourneyStops(journeyId: number) {
  const [stops, setStops] = useState<JourneyStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStops = useCallback(async () => {
    try {
      setLoading(true);
      const response = await journeyStopApi.getByJourneyId(journeyId);
      setStops(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load stops');
      console.error('Error fetching stops:', err);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    if (journeyId) {
      fetchStops();
    }
  }, [journeyId, fetchStops]);

  const addStop = async (data: Omit<JourneyStop, 'id'>) => {
    try {
      const response = await journeyStopApi.create({
        ...data,
        journey_id: journeyId,
      });
      setStops((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error adding stop:', err);
      throw err;
    }
  };

  const updateStop = async (stopId: number, data: Partial<JourneyStop>) => {
    try {
      const response = await journeyStopApi.update(journeyId, stopId, data);
      setStops((prev) =>
        prev.map((stop) => (stop.id === stopId ? response.data : stop))
      );
      return response.data;
    } catch (err) {
      console.error('Error updating stop:', err);
      throw err;
    }
  };

  const deleteStop = async (stopId: number) => {
    try {
      await journeyStopApi.delete(journeyId, stopId);
      setStops((prev) => prev.filter((stop) => stop.id !== stopId));
    } catch (err) {
      console.error('Error deleting stop:', err);
      throw err;
    }
  };

  const reorderStops = async (stopIds: number[]) => {
    try {
      const response = await journeyStopApi.reorder(journeyId, stopIds);
      setStops(response.data);
    } catch (err) {
      console.error('Error reordering stops:', err);
      throw err;
    }
  };

  return {
    stops,
    loading,
    error,
    fetchStops,
    addStop,
    updateStop,
    deleteStop,
    reorderStops,
  };
}

export function useStopOptions(stopId: number) {
  const [options, setOptions] = useState<StopOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stopOptionApi.getByStopId(stopId);
      setOptions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load options');
      console.error('Error fetching options:', err);
    } finally {
      setLoading(false);
    }
  }, [stopId]);

  useEffect(() => {
    if (stopId) {
      fetchOptions();
    }
  }, [stopId, fetchOptions]);

  const addOption = async (data: Omit<StopOption, 'id'>) => {
    try {
      const response = await stopOptionApi.create({
        ...data,
        stop_id: stopId,
      });
      setOptions((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error adding option:', err);
      throw err;
    }
  };

  const updateOption = async (optionId: number, data: Partial<StopOption>) => {
    try {
      const response = await stopOptionApi.update(stopId, optionId, data);
      setOptions((prev) =>
        prev.map((opt) => (opt.id === optionId ? response.data : opt))
      );
      return response.data;
    } catch (err) {
      console.error('Error updating option:', err);
      throw err;
    }
  };

  const deleteOption = async (optionId: number) => {
    try {
      await stopOptionApi.delete(stopId, optionId);
      setOptions((prev) => prev.filter((opt) => opt.id !== optionId));
    } catch (err) {
      console.error('Error deleting option:', err);
      throw err;
    }
  };

  const updateOptionStatus = async (optionId: number, status: StopOptionStatus) => {
    try {
      const response = await stopOptionApi.updateStatus(stopId, optionId, status);
      setOptions((prev) =>
        prev.map((opt) => (opt.id === optionId ? response.data : opt))
      );
      return response.data;
    } catch (err) {
      console.error('Error updating option status:', err);
      throw err;
    }
  };

  return {
    options,
    loading,
    error,
    fetchOptions,
    addOption,
    updateOption,
    deleteOption,
    updateOptionStatus,
  };
}

export const optionTypeLabels: Record<string, string> = {
  activity: 'Activity',
  meal: 'Meal',
  sightseeing: 'Sightseeing',
  rest: 'Rest Stop',
  fuel: 'Fuel',
  shopping: 'Shopping',
  other: 'Other',
};

export const optionStatusColors: Record<StopOptionStatus, string> = {
  considering: 'bg-gray-100 text-gray-800',
  selected: 'bg-blue-100 text-blue-800',
  skipped: 'bg-red-100 text-red-800',
  done: 'bg-green-100 text-green-800',
};

export const optionTypeIcons: Record<string, string> = {
  activity: '🎯',
  meal: '🍽️',
  sightseeing: '📸',
  rest: '☕',
  fuel: '⛽',
  shopping: '🛍️',
  other: '📍',
};
