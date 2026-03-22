'use client';

import { useState } from 'react';
import { Destination, DestinationFormData } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { destinationApi } from '@/lib/api';
import { autoCreateDaysForDestination } from '@/lib/destination-day-utils';
import type { LocationSearchResult } from '@/components/shared/LocationSearchBox';
import { useTripContext } from '@/lib/trip-context';
import { tripApi } from '@/lib/api';

const createInitialFormData = (
  tripId: number,
  startDate?: string,
  endDate?: string,
  defaultTimezone?: string
): DestinationFormData => ({
  trip_id: tripId,
  name: '',
  country: '',
  region: '',
  timezone: defaultTimezone || getLocalTimezone(),
  arrival_date: startDate || '',
  departure_date: endDate || '',
  latitude: undefined,
  longitude: undefined,
});

export function useDestinationForm(
  tripId: number,
  onSuccess: () => void,
  startDate?: string,
  endDate?: string,
  defaultTimezone?: string,
  destinationCount: number = 0
) {
  const tripContextValue = useTripContext();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DestinationFormData>(
    createInitialFormData(tripId, startDate, endDate, defaultTimezone)
  );
  const [locationWarning, setLocationWarning] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setFormData(createInitialFormData(tripId, startDate, endDate, defaultTimezone));
  };

  const handleLocationRetrieve = (result: LocationSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      name: result.text,
      country: result.country ?? prev.country,
      latitude: result.lat,
      longitude: result.lng,
    }));
    if (!result.country) {
      setLocationWarning("We couldn't confirm this location — check the spelling or add a country for precision.");
    } else {
      setLocationWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let savedDest: ReturnType<typeof destinationApi.update> | ReturnType<typeof destinationApi.create>;

      if (editingId) {
        savedDest = destinationApi.update(editingId, formData);
      } else {
        savedDest = destinationApi.create(formData);
      }

      const isNew = !editingId;
      const response = await savedDest;
      const destinationId = response.data?.id;

      if (isNew && destinationId && formData.arrival_date && formData.departure_date) {
        if (window.confirm(`Create itinerary days for ${formData.name} (${formData.arrival_date} – ${formData.departure_date})?`)) {
          try {
            await autoCreateDaysForDestination({
              tripId,
              destinationId,
              destinationName: formData.name,
              arrivalDate: formData.arrival_date,
              departureDate: formData.departure_date
            });
          } catch (err) {
            console.error("Failed to auto create days", err);
          }
        }
      }

      if (isNew && destinationCount === 1) {
        // Transition exactly from 1 -> 2
        try {
           const ctx = tripContextValue?.tripContext;
           if (ctx && ctx.trip_type === 'single_city') {
             await tripApi.update(tripId, { context: { ...ctx, trip_type: 'multi_city' } });
             alert('Trip type updated to Multi-City');
           }
        } catch (e) {
           console.error('Failed to update trip type', e);
        }
      }

      resetForm();
      onSuccess();

    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Failed to save destination');
    } finally {
      setIsSubmitting(false);
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
      latitude: dest.latitude,
      longitude: dest.longitude,
    });
  };

  const updateField = <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
  ) => {
    if (field === 'name' && locationWarning) setLocationWarning(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    editingId,
    isEditing: editingId !== null,
    isSubmitting,
    locationWarning,
    handleSubmit,
    handleLocationRetrieve,
    startEdit,
    resetForm,
    updateField,
  };
}
