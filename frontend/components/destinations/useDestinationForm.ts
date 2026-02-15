'use client';

import { useState } from 'react';
import { Destination, DestinationFormData } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { destinationApi } from '@/lib/api';

const createInitialFormData = (
  tripId: number,
  defaultTimezone?: string
): DestinationFormData => ({
  trip_id: tripId,
  name: '',
  country: '',
  region: '',
  timezone: defaultTimezone || getLocalTimezone(),
  arrival_date: '',
  departure_date: '',
});

export function useDestinationForm(
  tripId: number,
  onSuccess: () => void,
  defaultTimezone?: string
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<DestinationFormData>(
    createInitialFormData(tripId, defaultTimezone)
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData(createInitialFormData(tripId, defaultTimezone));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await destinationApi.update(editingId, formData);
      } else {
        await destinationApi.create(formData);
      }
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Failed to save destination');
    }
  };

  const startEdit = (dest: Destination) => {
    setEditingId(dest.id);
    setFormData({
      trip_id: tripId,
      name: dest.name,
      country: dest.country || '',
      region: dest.region || '',
      timezone: dest.timezone || defaultTimezone || getLocalTimezone(),
      arrival_date: dest.arrival_date || '',
      departure_date: dest.departure_date || '',
    });
  };

  const updateField = <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    editingId,
    isEditing: editingId !== null,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  };
}
