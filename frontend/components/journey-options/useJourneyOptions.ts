'use client';

import { useState, useEffect } from 'react';
import { JourneyOption, JourneyOptionFormData } from '@/lib/types';
import { journeyOptionApi } from '@/lib/api';

export function useJourneyOptions(journeyId: number) {
  const [options, setOptions] = useState<JourneyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = async () => {
    if (!journeyId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await journeyOptionApi.getByJourneyId(journeyId);
      setOptions(response.data);
    } catch (err) {
      setError('Failed to load booking options');
      console.error('Error fetching options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId]);

  const addOption = async (data: JourneyOptionFormData) => {
    try {
      const response = await journeyOptionApi.create(data);
      setOptions((prev) => [...prev, response.data]);
    } catch (err) {
      console.error('Error creating option:', err);
      throw err;
    }
  };

  const updateOption = async (id: number, data: Partial<JourneyOptionFormData>) => {
    try {
      const response = await journeyOptionApi.update(journeyId, id, data);
      setOptions((prev) =>
        prev.map((opt) => (opt.id === id ? response.data : opt))
      );
    } catch (err) {
      console.error('Error updating option:', err);
      throw err;
    }
  };

  const deleteOption = async (id: number) => {
    try {
      await journeyOptionApi.delete(journeyId, id);
      setOptions((prev) => prev.filter((opt) => opt.id !== id));
    } catch (err) {
      console.error('Error deleting option:', err);
      throw err;
    }
  };

  const selectOption = async (id: number) => {
    try {
      const response = await journeyOptionApi.select(journeyId, id);
      // Update the selected option and unselect others
      setOptions((prev) =>
        prev.map((opt) => ({
          ...opt,
          status: opt.id === id ? response.data.status : (opt.status === 'selected' ? 'researching' : opt.status),
        }))
      );
    } catch (err) {
      console.error('Error selecting option:', err);
      throw err;
    }
  };

  return {
    options,
    loading,
    error,
    addOption,
    updateOption,
    deleteOption,
    selectOption,
    refresh: fetchOptions,
  };
}
