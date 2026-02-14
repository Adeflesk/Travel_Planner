'use client';

import { useState, useEffect, useCallback } from 'react';
import { FlightLayover, FlightLayoverFormData } from '@/lib/types';
import { layoverApi } from '@/lib/api';

export function useLayovers(journeyId: number) {
  const [layovers, setLayovers] = useState<FlightLayover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLayovers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await layoverApi.getByJourneyId(journeyId);
      setLayovers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load layovers');
      console.error('Error fetching layovers:', err);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    if (journeyId) {
      fetchLayovers();
    }
  }, [journeyId, fetchLayovers]);

  const addLayover = async (data: FlightLayoverFormData) => {
    try {
      const response = await layoverApi.create({
        ...data,
        journey_id: journeyId,
      });
      setLayovers((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error adding layover:', err);
      throw err;
    }
  };

  const updateLayover = async (
    layoverId: number,
    data: Partial<FlightLayoverFormData>
  ) => {
    try {
      const response = await layoverApi.update(journeyId, layoverId, data);
      setLayovers((prev) =>
        prev.map((l) => (l.id === layoverId ? response.data : l))
      );
      return response.data;
    } catch (err) {
      console.error('Error updating layover:', err);
      throw err;
    }
  };

  const deleteLayover = async (layoverId: number) => {
    try {
      await layoverApi.delete(journeyId, layoverId);
      setLayovers((prev) => prev.filter((l) => l.id !== layoverId));
    } catch (err) {
      console.error('Error deleting layover:', err);
      throw err;
    }
  };

  const reorderLayovers = async (layoverIds: number[]) => {
    try {
      const response = await layoverApi.reorder(journeyId, layoverIds);
      setLayovers(response.data);
    } catch (err) {
      console.error('Error reordering layovers:', err);
      throw err;
    }
  };

  return {
    layovers,
    loading,
    error,
    fetchLayovers,
    addLayover,
    updateLayover,
    deleteLayover,
    reorderLayovers,
  };
}

/**
 * Calculate layover duration in minutes from arrival and departure times.
 */
export function getLayoverDurationMinutes(
  arrival?: string,
  departure?: string
): number | null {
  if (!arrival || !departure) return null;
  const arrivalDate = new Date(arrival);
  const departureDate = new Date(departure);
  const diffMs = departureDate.getTime() - arrivalDate.getTime();
  if (diffMs <= 0) return null;
  return Math.round(diffMs / 60000);
}

/**
 * Format duration in minutes to human-readable string (e.g., "2h 35m").
 */
export function formatLayoverDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Get duration color class based on layover length:
 * - Green: < 2 hours (short, comfortable)
 * - Amber: 2-4 hours (medium)
 * - Red: > 4 hours (long)
 */
export function getDurationColorClass(minutes: number | null): string {
  if (!minutes || minutes <= 0) return 'bg-gray-100 text-gray-700';
  if (minutes < 120) return 'bg-green-100 text-green-700';
  if (minutes <= 240) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}
