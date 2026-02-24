'use client';

import { useState, useEffect } from 'react';
import { Journey, JourneyFormData, Trip } from '@/lib/types';
import { journeyApi, tripApi } from '@/lib/api';
import { useSuggestions } from '@/lib/hooks/useSuggestions';

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
  origin_timezone: undefined,
  destination_timezone: undefined,
  departure_datetime: '',
  arrival_datetime: '',
  carrier: '',
  booking_reference: '',
  cost: undefined,
  currency: 'USD',
  notes: '',
  status: 'planned',
  segments: [],
});

export function useJourneyForm(tripId: number, onSuccess: () => void) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<JourneyFormData>(
    getInitialFormData(tripId)
  );
  const [trip, setTrip] = useState<Trip | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [warnings, setWarnings] = useState<ValidationWarnings>({});

  // Fetch carrier suggestions
  const { suggestions: carrierSuggestions, recentItems: recentCarriers, loading: loadingCarriers } =
    useSuggestions('carriers');

  // Fetch currency suggestions for context-aware defaults
  const { suggestions: currencySuggestions } = useSuggestions('currencies');

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

  // Context-aware defaults: Set currency to most common from user's history
  useEffect(() => {
    if (!editingId && currencySuggestions.length > 0 && formData.currency === 'USD') {
      const defaultCurrency = currencySuggestions[0];
      if (defaultCurrency && defaultCurrency !== 'USD') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({ ...prev, currency: defaultCurrency }));
      }
    }
  }, [editingId, currencySuggestions, formData.currency]);

  // Context-aware defaults: Pre-fill date fields with year/month from trip start
  useEffect(() => {
    if (!editingId && trip && !formData.departure_datetime && !formData.arrival_datetime) {
      const tripStart = new Date(trip.start_date);
      const year = tripStart.getFullYear();
      const month = String(tripStart.getMonth() + 1).padStart(2, '0');
      const day = String(tripStart.getDate()).padStart(2, '0');

      const defaultDepartureDate = `${year}-${month}-${day}T09:00`;
      const defaultArrivalDate = `${year}-${month}-${day}T11:00`;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        departure_datetime: defaultDepartureDate,
        arrival_datetime: defaultArrivalDate
      }));
    }
  }, [editingId, trip, formData.departure_datetime, formData.arrival_datetime]);

  // Validate form data
  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};
    const newWarnings: ValidationWarnings = {};

    if (formData.departure_datetime && formData.arrival_datetime) {
      const departure = new Date(formData.departure_datetime);
      const arrival = new Date(formData.arrival_datetime);
      if (departure >= arrival) {
        newErrors.departure_arrival = 'Departure must be before arrival';
      }
    }

    if (trip && (formData.departure_datetime || formData.arrival_datetime)) {
      const tripStart = new Date(trip.start_date);
      const tripEnd = new Date(trip.end_date);
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

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    console.log('Submitting journey formData:', formData);

    if (!formData.transport_mode || formData.transport_mode.trim() === '') {
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
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.error('Journey save error - Status:', axiosError.response?.status);
        console.error('Journey save error - Detail:', JSON.stringify(axiosError.response?.data, null, 2));
      } else {
        console.error('Error saving journey:', error);
      }
      alert('Failed to save journey. Check browser console for details.');
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
      origin_timezone: journey.origin_timezone,
      destination_timezone: journey.destination_timezone,
      departure_datetime: journey.departure_datetime || '',
      arrival_datetime: journey.arrival_datetime || '',
      carrier: journey.carrier || '',
      booking_reference: journey.booking_reference || '',
      cost: journey.cost,
      currency: journey.currency || 'USD',
      notes: journey.notes || '',
      status: journey.status || 'planned',
      segments: [],
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(getInitialFormData(tripId));
    setErrors({});
    setWarnings({});
  };

  const duplicateAsReturn = (journey: Journey) => {
    setEditingId(null);
    setFormData({
      trip_id: tripId,
      origin_id: journey.destination_id,
      destination_id: journey.origin_id,
      origin_name: journey.destination_name,
      destination_name: journey.origin_name,
      origin_timezone: journey.destination_timezone,
      destination_timezone: journey.origin_timezone,
      transport_mode: journey.transport_mode,
      carrier: journey.carrier || '',
      cost: journey.cost,
      currency: journey.currency || 'USD',
      notes: journey.notes || '',
      departure_datetime: '',
      arrival_datetime: '',
      booking_reference: '',
      status: 'planned',
      segments: [],
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
    editingId,
    errors,
    warnings,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
    duplicateAsReturn,
    carrierSuggestions,
    recentCarriers,
    loadingCarriers,
  };
}
