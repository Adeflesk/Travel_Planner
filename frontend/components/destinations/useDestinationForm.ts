'use client';

import { useState } from 'react';
import { Destination, DestinationFormData } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { destinationApi } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode-utils';
import { autoCreateDaysForDestination } from '@/lib/destination-day-utils';

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
});

export function useDestinationForm(
  tripId: number,
  onSuccess: () => void,
  startDate?: string,
  endDate?: string,
  defaultTimezone?: string
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DestinationFormData>(
    createInitialFormData(tripId, startDate, endDate, defaultTimezone)
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData(createInitialFormData(tripId, startDate, endDate, defaultTimezone));
    setLocationWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocationWarning(null);
    setIsSubmitting(true);

    let preGeocodedCoords: { lat: number; lng: number } | null = null;

    // Validate location for new destinations only
    if (!editingId) {
      const addressParts = [formData.name, formData.region, formData.country].filter(Boolean);
      const address = addressParts.join(', ');
      if (address) {
        preGeocodedCoords = await geocodeAddress(address);
        if (!preGeocodedCoords) {
          setLocationWarning("We couldn't confirm this location — check the spelling if needed.");
        }
      }
    }

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

      resetForm();
      onSuccess();

      // Persist coordinates using the already-fetched result — no second Nominatim call
      if (isNew && destinationId && preGeocodedCoords) {
        destinationApi.update(destinationId, {
          latitude: preGeocodedCoords.lat,
          longitude: preGeocodedCoords.lng,
        }).catch(err => console.error('Failed to save geocoded coordinates for destination:', err));
      }

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
    });
  };

  const updateField = <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (['name', 'region', 'country'].includes(field as string) && locationWarning) {
      setLocationWarning(null);
    }
  };

  return {
    formData,
    editingId,
    isEditing: editingId !== null,
    locationWarning,
    isSubmitting,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  };
}
