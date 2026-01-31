'use client';

import { useState } from 'react';
import { Journey, JourneyFormData } from '@/lib/types';
import { journeyApi } from '@/lib/api';

const getInitialFormData = (tripId: number): JourneyFormData => ({
  trip_id: tripId,
  transport_mode: '',
  origin_id: undefined,
  destination_id: undefined,
  origin_name: undefined,
  destination_name: undefined,
  departure_datetime: '',
  arrival_datetime: '',
  carrier: '',
  booking_reference: '',
  cost: undefined,
  currency: 'USD',
  notes: '',
  status: 'planned',
});

export function useJourneyForm(tripId: number, onSuccess: () => void) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<JourneyFormData>(
    getInitialFormData(tripId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await journeyApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await journeyApi.create(formData);
      }
      setFormData(getInitialFormData(tripId));
      onSuccess();
    } catch (error) {
      console.error('Error saving journey:', error);
      alert('Failed to save journey');
    }
  };

  const startEdit = (journey: Journey) => {
    setEditingId(journey.id);
    setFormData({
      trip_id: tripId,
      transport_mode: journey.transport_mode,
      origin_id: journey.origin_id,
      destination_id: journey.destination_id,
      origin_name: journey.origin_name,
      destination_name: journey.destination_name,
      departure_datetime: journey.departure_datetime || '',
      arrival_datetime: journey.arrival_datetime || '',
      carrier: journey.carrier || '',
      booking_reference: journey.booking_reference || '',
      cost: journey.cost,
      currency: journey.currency || 'USD',
      notes: journey.notes || '',
      status: journey.status || 'planned',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(getInitialFormData(tripId));
  };

  const updateField = <K extends keyof JourneyFormData>(
    field: K,
    value: JourneyFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    isEditing: editingId !== null,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  };
}
