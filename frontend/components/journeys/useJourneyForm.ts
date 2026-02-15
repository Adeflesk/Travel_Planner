'use client';

import { useState, useEffect } from 'react';
import { Journey, JourneyFormData, JourneySegmentDraft, Trip } from '@/lib/types';
import { activityApi, expenseApi, journeyApi, journeySegmentApi, tripApi } from '@/lib/api';
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
      // If the form is new (not editing) and currency is still default USD,
      // set it to the user's most common currency
      const defaultCurrency = currencySuggestions[0];
      if (defaultCurrency && defaultCurrency !== 'USD') {
        // This is an initialization effect - sets smart defaults on mount
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

      // Default to trip start date at 9:00 AM for departure
      const defaultDepartureDate = `${year}-${month}-${day}T09:00`;

      // This is an initialization effect - sets smart defaults on mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        departure_datetime: defaultDepartureDate
      }));
    }
  }, [editingId, trip, formData.departure_datetime, formData.arrival_datetime]);

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
      const parkingSegments = (formData.segments ?? []).filter(
        (segment) =>
          segment.segment_type === 'TRANSFER' &&
          String(segment.metadata?.mode ?? '') === 'car' &&
          Boolean(segment.metadata?.parkingEnabled)
      );

      const missingParkingCost = parkingSegments.some(
        (segment) => segment.metadata?.parkingCost === undefined || segment.metadata?.parkingCost === ''
      );
      if (missingParkingCost) {
        alert('Please enter a parking cost for the enabled airport parking option.');
        return;
      }

      const { segments, ...journeyPayload } = formData;

      const deriveJourneyPayload = () => {
        const nextPayload = { ...journeyPayload };
        const draftSegments = segments ?? [];
        if (draftSegments.length === 0) return nextPayload;

        if (!nextPayload.transport_mode) {
          const hasFlight = draftSegments.some((segment) => segment.segment_type === 'FLIGHT');
          nextPayload.transport_mode = hasFlight ? 'flight' : 'car';
        }

        const firstSegment = draftSegments[0];
        const lastSegment = draftSegments[draftSegments.length - 1];

        if (!nextPayload.origin_id && !nextPayload.origin_name) {
          nextPayload.origin_id = firstSegment.origin.destination_id;
          nextPayload.origin_name = firstSegment.origin.name || undefined;
        }

        if (!nextPayload.destination_id && !nextPayload.destination_name) {
          nextPayload.destination_id = lastSegment.destination.destination_id;
          nextPayload.destination_name = lastSegment.destination.name || undefined;
        }

        if (!nextPayload.departure_datetime && firstSegment.start_datetime) {
          nextPayload.departure_datetime = firstSegment.start_datetime;
        }

        if (!nextPayload.arrival_datetime && lastSegment.end_datetime) {
          nextPayload.arrival_datetime = lastSegment.end_datetime;
        }

        return nextPayload;
      };

      const derivedJourneyPayload = deriveJourneyPayload();

      if (editingId) {
        await journeyApi.update(editingId, derivedJourneyPayload);
        setEditingId(null);
      } else {
        const createResponse = await journeyApi.create(derivedJourneyPayload);
        const journeyId = createResponse.data.id;

        if (segments && segments.length > 0) {
          const segmentPayloads = segments.map((segment, index) => {
            const payload = {
              journey_id: journeyId,
              segment_type: segment.segment_type,
              origin_id: segment.origin.destination_id,
              origin_name: segment.origin.name || undefined,
              destination_id: segment.destination.destination_id,
              destination_name: segment.destination.name || undefined,
              start_datetime: segment.start_datetime,
              end_datetime: segment.end_datetime,
              origin_timezone: segment.origin_timezone,
              destination_timezone: segment.destination_timezone,
              metadata: segment.metadata ?? {},
              order: index,
            };
            return payload;
          });

          await Promise.all(
            segmentPayloads.map((payload) =>
              journeySegmentApi.create(journeyId, payload)
            )
          );
        }

        if (parkingSegments.length > 0) {
          const destinationId = derivedJourneyPayload.origin_id ?? derivedJourneyPayload.destination_id;
          const baseDate = derivedJourneyPayload.departure_datetime || derivedJourneyPayload.arrival_datetime || '';
          const datePart = baseDate ? baseDate.split('T')[0] : '';
          const timePart = baseDate && baseDate.includes('T')
            ? baseDate.split('T')[1]?.replace('Z', '').slice(0, 5)
            : undefined;

          if (!destinationId) {
            console.warn('No destination selected for airport parking activity. Skipping activity creation.');
          }

          await Promise.all(parkingSegments.map((segment, index) => {
            const parkingCostRaw = segment.metadata?.parkingCost;
            const parkingCost = typeof parkingCostRaw === 'number'
              ? parkingCostRaw
              : parseFloat(String(parkingCostRaw));
            const parkingReference = String(segment.metadata?.parkingReference ?? '').trim();
            const expenseDescription = parkingReference
              ? `Airport parking (ref: ${parkingReference})`
              : 'Airport parking';

            const activityPromise = destinationId
              ? activityApi.create({
                destination_id: destinationId,
                name: 'Airport parking',
                activity_type: 'parking',
                scheduled_date: datePart || undefined,
                scheduled_time: timePart,
                cost: parkingCost,
                booking_reference: parkingReference || undefined,
                notes: `Segment ${index + 1} parking`,
                status: 'planned',
              })
              : Promise.resolve(null);

            const expensePromise = expenseApi.create({
              trip_id: tripId,
              destination_id: destinationId ?? undefined,
              category: 'parking',
              amount: parkingCost,
              currency: derivedJourneyPayload.currency || 'USD',
              description: expenseDescription,
              date: datePart || new Date().toISOString().slice(0, 10),
              booked: true,
              paid: false,
            });

            return Promise.all([activityPromise, expensePromise]);
          }));
        }
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
    carrierSuggestions,
    recentCarriers,
    loadingCarriers,
  };
}
