'use client';

import { useState, useEffect } from 'react';
import { Journey, JourneyFormData, Trip } from '@/lib/types';
import { journeyApi, tripApi } from '@/lib/api';

export interface ValidationErrors {
  departure_arrival?: string;
}

export interface ValidationWarnings {
  outside_trip_dates?: string;
}

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
  const [trip, setTrip] = useState<Trip | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [warnings, setWarnings] = useState<ValidationWarnings>({});

  // Fetch trip data for date validation
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await tripApi.getById(tripId);
        setTrip(response.data);
      } catch (error) {
        console.error('Error fetching trip:', error);
      }
    };
    fetchTrip();
  }, [tripId]);

  // Validate form data
  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};
    const newWarnings: ValidationWarnings = {};

    // Check departure is before arrival
    if (formData.departure_datetime && formData.arrival_datetime) {
      const departure = new Date(formData.departure_datetime);
      const arrival = new Date(formData.arrival_datetime);
      if (departure >= arrival) {
        newErrors.departure_arrival = 'Departure must be before arrival';
      }
    }

    // Check if journey dates fall within trip dates (warning only)
    if (trip && (formData.departure_datetime || formData.arrival_datetime)) {
      const tripStart = new Date(trip.start_date);
      const tripEnd = new Date(trip.end_date);
      // Set trip end to end of day for comparison
      tripEnd.setHours(23, 59, 59, 999);

      const departure = formData.departure_datetime
        ? new Date(formData.departure_datetime)
        : null;
      const arrival = formData.arrival_datetime
        ? new Date(formData.arrival_datetime)
        : null;

      const isOutsideRange =
        (departure && (departure < tripStart || departure > tripEnd)) ||
        (arrival && (arrival < tripStart || arrival > tripEnd));

      if (isOutsideRange) {
        newWarnings.outside_trip_dates = `Journey dates are outside trip range (${trip.start_date} to ${trip.end_date})`;
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);

    // Return true if no errors (warnings are allowed)
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before submitting
    if (!validate()) {
      return;
    }

    try {
      if (editingId) {
        await journeyApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await journeyApi.create(formData);
      }
      setFormData(getInitialFormData(tripId));
      setErrors({});
      setWarnings({});
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
    setErrors({});
    setWarnings({});
  };

  // Duplicate journey as return trip (swap origin/destination)
  const duplicateAsReturn = (journey: Journey) => {
    setEditingId(null); // Creating new, not editing
    setFormData({
      trip_id: tripId,
      // Swap origin and destination
      origin_id: journey.destination_id,
      destination_id: journey.origin_id,
      origin_name: journey.destination_name,
      destination_name: journey.origin_name,
      // Keep transport details
      transport_mode: journey.transport_mode,
      carrier: journey.carrier || '',
      cost: journey.cost,
      currency: journey.currency || 'USD',
      notes: journey.notes || '',
      // Clear booking-specific fields
      departure_datetime: '',
      arrival_datetime: '',
      booking_reference: '',
      status: 'planned',
    });
    setErrors({});
    setWarnings({});
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
    errors,
    warnings,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
    duplicateAsReturn,
  };
}
