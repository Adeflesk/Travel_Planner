'use client';

import { useState, useEffect } from 'react';
import { JourneyFormData, Destination, RouteType } from '@/lib/types';
import { transportModes } from './useJourneys';
import { ValidationErrors, ValidationWarnings } from './useJourneyForm';
import { LayoverDraftList, LayoverList, DraftLayover } from '@/components/layovers';
import { JourneyOptionsPanel, useJourneyOptions } from '@/components/journey-options';
import { useTransportModeCapabilities } from './useTransportModeCapabilities';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Route } from 'lucide-react';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { AirportAutocomplete } from '@/components/ui/AirportAutocomplete';
import { useTripContext } from '@/lib/trip-context';
import { getDateTimeConstraints } from '@/lib/date-constraints';
import { calculateFlightDuration } from '@/lib/timezone-utils';

const routeTypes: { value: RouteType; label: string }[] = [
  { value: 'fastest', label: 'Fastest (Highways)' },
  { value: 'shortest', label: 'Shortest Distance' },
  { value: 'scenic', label: 'Scenic Route' },
  { value: 'avoid_highways', label: 'Avoid Highways' },
  { value: 'avoid_tolls', label: 'Avoid Tolls' },
];

interface JourneyFormProps {
  formData: JourneyFormData;
  isEditing: boolean;
  editingId?: number | null;
  destinations: Destination[];
  errors?: ValidationErrors;
  warnings?: ValidationWarnings;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof JourneyFormData>(
    field: K,
    value: JourneyFormData[K]
  ) => void;
  draftLayovers: DraftLayover[];
  setDraftLayovers: (layovers: DraftLayover[]) => void;
  carrierSuggestions?: string[];
  recentCarriers?: string[];
  loadingCarriers?: boolean;
}

export function JourneyForm({
  formData,
  isEditing,
  editingId,
  destinations,
  errors = {},
  warnings = {},
  onSubmit,
  onCancel,
  updateField,
  draftLayovers,
  setDraftLayovers,
  carrierSuggestions = [],
  recentCarriers = [],
  loadingCarriers = false,
}: JourneyFormProps) {
  const [showRouteDetails, setShowRouteDetails] = useState(
    // Auto-expand if route details exist
    !!(formData.distance_km || formData.distance_miles || formData.estimated_duration_minutes || formData.route_type || formData.has_tolls || formData.toll_cost || formData.route_notes)
  );

  // Get trip context for date constraints
  const tripContext = useTripContext();

  // Calculate date/time constraints based on trip dates
  const dateTimeConstraints = getDateTimeConstraints(
    tripContext?.startDate,
    tripContext?.endDate,
    {
      allowBeforeStart: true, // Allow booking flights before trip starts
      allowAfterEnd: true,     // Allow return flights after trip ends
      defaultTo: 'start',
      defaultTime: '09:00',
    }
  );

  // Journey options hook (only for existing journeys)
  const journeyOptions = useJourneyOptions(editingId || 0);

  // Transport mode capabilities
  const modeCapabilities = useTransportModeCapabilities(formData.transport_mode);

  // Apply smart defaults when transport mode changes (only for new journeys)
  useEffect(() => {
    if (!isEditing && formData.transport_mode && modeCapabilities.config) {
      // Set default flexibility level
      if (modeCapabilities.defaultFlexibility && !formData.flexibility_level) {
        updateField('flexibility_level', modeCapabilities.defaultFlexibility);
      }
      
      // Set default booking status
      if (typeof modeCapabilities.defaultIsBooked !== 'undefined' && typeof formData.is_booked === 'undefined') {
        updateField('is_booked', modeCapabilities.defaultIsBooked);
      }
    }
  }, [formData.transport_mode, modeCapabilities.config, modeCapabilities.defaultFlexibility, modeCapabilities.defaultIsBooked, formData.flexibility_level, formData.is_booked, isEditing, updateField]);

  // Date input mode: 'time' = explicit arrival time, 'duration' = calculate from duration
  const [dateInputMode, setDateInputMode] = useState<'time' | 'duration'>('time');
  const [durationHours, setDurationHours] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);

  // Enforce mode-specific constraints
  useEffect(() => {
    if (!formData.transport_mode || !modeCapabilities.config) {
      return;
    }

    if (modeCapabilities.requiresExactTimes && dateInputMode === 'duration') {
      setDateInputMode('time');
    }

    if (!modeCapabilities.canHaveBookingStatus && formData.is_booked === false) {
      updateField('is_booked', true);
    }

    if (!modeCapabilities.canHaveFrequency && formData.frequency) {
      updateField('frequency', undefined);
    }

    if (!modeCapabilities.canBeFlexible && formData.flexibility_level && formData.flexibility_level !== 'exact') {
      updateField('flexibility_level', 'exact');
    }
  }, [
    formData.transport_mode,
    modeCapabilities.config,
    modeCapabilities.requiresExactTimes,
    modeCapabilities.canHaveBookingStatus,
    modeCapabilities.canHaveFrequency,
    modeCapabilities.canBeFlexible,
    dateInputMode,
    formData.is_booked,
    formData.frequency,
    formData.flexibility_level,
    updateField,
  ]);

  // Calculate duration from departure and arrival times
  const calculateDuration = () => {
    if (formData.departure_datetime && formData.arrival_datetime) {
      // Use timezone-aware calculation if we have timezone data
      if (formData.origin_timezone && formData.destination_timezone) {
        const totalMinutes = calculateFlightDuration(
          formData.departure_datetime,
          formData.arrival_datetime,
          formData.origin_timezone,
          formData.destination_timezone
        );
        return {
          hours: Math.floor(totalMinutes / 60),
          minutes: totalMinutes % 60,
          totalMinutes
        };
      }
      
      // Fall back to simple calculation if no timezone data
      const departure = new Date(formData.departure_datetime);
      const arrival = new Date(formData.arrival_datetime);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      return {
        hours: Math.floor(diffMinutes / 60),
        minutes: diffMinutes % 60,
        totalMinutes: diffMinutes
      };
    }
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  };

  // Calculate arrival time from departure + duration
  const calculateArrival = (departureStr: string, hours: number, minutes: number) => {
    if (!departureStr) return '';
    const departure = new Date(departureStr);
    const totalMinutes = (hours * 60) + minutes;
    const arrival = new Date(departure.getTime() + totalMinutes * 60000);

    // Format as datetime-local string: YYYY-MM-DDTHH:mm
    const year = arrival.getFullYear();
    const month = String(arrival.getMonth() + 1).padStart(2, '0');
    const day = String(arrival.getDate()).padStart(2, '0');
    const hour = String(arrival.getHours()).padStart(2, '0');
    const minute = String(arrival.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  // Update duration when mode switches to duration or times change
  const handleModeSwitch = (mode: 'time' | 'duration') => {
    setDateInputMode(mode);
    if (mode === 'duration') {
      // Switching to duration mode - calculate duration from current times
      const duration = calculateDuration();
      setDurationHours(duration.hours);
      setDurationMinutes(duration.minutes);
    } else {
      // Switching to time mode - calculate arrival from current duration
      if (formData.departure_datetime && (durationHours > 0 || durationMinutes > 0)) {
        const arrival = calculateArrival(formData.departure_datetime, durationHours, durationMinutes);
        updateField('arrival_datetime', arrival);
      }
    }
  };

  // Handle journey duration change - recalculate arrival time
  const handleJourneyDurationChange = (hours: number, minutes: number) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    if (formData.departure_datetime) {
      const arrival = calculateArrival(formData.departure_datetime, hours, minutes);
      updateField('arrival_datetime', arrival);
    }
  };

  // Sync duration values when times change (e.g., when editing existing journey)
  useEffect(() => {
    if (dateInputMode === 'duration' && formData.departure_datetime && formData.arrival_datetime) {
      const departure = new Date(formData.departure_datetime);
      const arrival = new Date(formData.arrival_datetime);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      // Synchronize local duration state with form data - valid use case for effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDurationHours(hours);
      setDurationMinutes(minutes);
    }
  }, [formData.departure_datetime, formData.arrival_datetime, dateInputMode, setDurationHours, setDurationMinutes]);


  // Format duration for display (hours and minutes)
  const formatDurationForInput = (minutes?: number): { hours: string; mins: string } => {
    if (!minutes) return { hours: '', mins: '' };
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours: hours.toString(), mins: mins.toString() };
  };

  const handleDurationChange = (hours: string, mins: string) => {
    const h = parseInt(hours) || 0;
    const m = parseInt(mins) || 0;
    const totalMinutes = h * 60 + m;
    updateField('estimated_duration_minutes', totalMinutes > 0 ? totalMinutes : undefined);
  };

  const durationParts = formatDurationForInput(formData.estimated_duration_minutes);

  const modeSummaryItems = [] as string[];
  if (modeCapabilities.canHaveLayovers) {
    modeSummaryItems.push('Layovers');
  }
  if (modeCapabilities.canHaveRouteDetails) {
    modeSummaryItems.push('Route details');
  }
  if (modeCapabilities.canHaveBookingStatus) {
    modeSummaryItems.push('Booking status');
  }
  if (modeCapabilities.canHaveBookingOptions) {
    modeSummaryItems.push('Booking options');
  }
  if (modeCapabilities.canHaveFrequency) {
    modeSummaryItems.push('Frequency');
  }
  if (modeCapabilities.requiresExactTimes) {
    modeSummaryItems.push('Exact times');
  } else {
    modeSummaryItems.push('Flexible timing');
  }

  const handleTransportModeChange = (mode: string) => {
    updateField('transport_mode', mode);

    if (!isEditing) {
      updateField('flexibility_level', undefined);
      updateField('is_booked', undefined);
      updateField('frequency', undefined);
      updateField('booking_opens_date', undefined);
      updateField('booking_deadline', undefined);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-3">
        {isEditing ? 'Edit Journey' : 'Add Journey'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Transport Mode</label>
          <select
            value={formData.transport_mode}
            onChange={(e) => handleTransportModeChange(e.target.value)}
            required
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select Transport</option>
            {transportModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
          {formData.transport_mode && (modeCapabilities.hint || modeSummaryItems.length > 0) && (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
              {modeCapabilities.hint && (
                <p className="mb-1">{modeCapabilities.hint}</p>
              )}
              {modeSummaryItems.length > 0 && (
                <p>
                  <span className="font-medium text-slate-700">Includes:</span>{' '}
                  {modeSummaryItems.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <AutocompleteInput
            label="Carrier"
            hint="optional"
            value={formData.carrier}
            onChange={(e) => updateField('carrier', e.target.value)}
            onSelect={(value) => updateField('carrier', value)}
            suggestions={carrierSuggestions}
            recentItems={recentCarriers}
            loading={loadingCarriers}
            placeholder="e.g., British Airways, Eurostar"
            showRecentFirst={true}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">From</label>
          <select
            value={formData.origin_id ? String(formData.origin_id) : (formData.origin_name !== undefined ? 'other' : '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'other') {
                updateField('origin_id', undefined);
                updateField('origin_name', formData.origin_name || '');
                // Clear timezone when switching to manual entry
                if (formData.transport_mode !== 'flight') {
                  updateField('origin_timezone', undefined);
                }
              } else if (value) {
                updateField('origin_id', parseInt(value));
                updateField('origin_name', undefined);
                updateField('origin_timezone', undefined);
              } else {
                updateField('origin_id', undefined);
                updateField('origin_name', undefined);
                updateField('origin_timezone', undefined);
              }
            }}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select Origin</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
                {dest.country ? `, ${dest.country}` : ''}
              </option>
            ))}
            <option value="other">
              {formData.transport_mode === 'flight' ? '✈️ Search Airports' : '📍 Other Location (e.g., Home Airport)'}
            </option>
          </select>
          {formData.origin_name !== undefined && formData.transport_mode === 'flight' && (
            <div className="mt-2">
              <AirportAutocomplete
                value={formData.origin_name || ''}
                onChange={(airport) => {
                  updateField('origin_name', airport ? `${airport.name} (${airport.iata})` : '');
                  updateField('origin_timezone', airport?.timezone);
                }}
                placeholder="Search airports by name or IATA code..."
              />
              {formData.origin_timezone && (
                <p className="text-xs text-gray-500 mt-1">
                  Timezone: {formData.origin_timezone}
                </p>
              )}
            </div>
          )}
          {formData.origin_name !== undefined && formData.transport_mode !== 'flight' && (
            <input
              type="text"
              value={formData.origin_name || ''}
              onChange={(e) => updateField('origin_name', e.target.value)}
              placeholder="e.g., Dublin Airport (DUB)"
              className="mt-2 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">To</label>
          <select
            value={formData.destination_id ? String(formData.destination_id) : (formData.destination_name !== undefined ? 'other' : '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'other') {
                updateField('destination_id', undefined);
                updateField('destination_name', formData.destination_name || '');
                // Clear timezone when switching to manual entry
                if (formData.transport_mode !== 'flight') {
                  updateField('destination_timezone', undefined);
                }
              } else if (value) {
                updateField('destination_id', parseInt(value));
                updateField('destination_name', undefined);
                updateField('destination_timezone', undefined);
              } else {
                updateField('destination_id', undefined);
                updateField('destination_name', undefined);
                updateField('destination_timezone', undefined);
              }
            }}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select Destination</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
                {dest.country ? `, ${dest.country}` : ''}
              </option>
            ))}
            <option value="other">
              {formData.transport_mode === 'flight' ? '✈️ Search Airports' : '📍 Other Location (e.g., Home Airport)'}
            </option>
          </select>
          {formData.destination_name !== undefined && formData.transport_mode === 'flight' && (
            <div className="mt-2">
              <AirportAutocomplete
                value={formData.destination_name || ''}
                onChange={(airport) => {
                  updateField('destination_name', airport ? `${airport.name} (${airport.iata})` : '');
                  updateField('destination_timezone', airport?.timezone);
                }}
                placeholder="Search airports by name or IATA code..."
              />
              {formData.destination_timezone && (
                <p className="text-xs text-gray-500 mt-1">
                  Timezone: {formData.destination_timezone}
                </p>
              )}
            </div>
          )}
          {formData.destination_name !== undefined && formData.transport_mode !== 'flight' && (
            <input
              type="text"
              value={formData.destination_name || ''}
              onChange={(e) => updateField('destination_name', e.target.value)}
              placeholder="e.g., Dublin Airport (DUB)"
              className="mt-2 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
            />
          )}
        </div>
        {/* Date Input Mode Toggle */}
        {!modeCapabilities.requiresExactTimes && (
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700">Journey Timing:</label>
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('time')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                    dateInputMode === 'time'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Exact Times
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('duration')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    dateInputMode === 'duration'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Duration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Mode: Departure + Arrival */}
        {dateInputMode === 'time' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Departure</label>
              <input
                type="datetime-local"
                value={formData.departure_datetime}
                onChange={(e) => updateField('departure_datetime', e.target.value)}
                min={dateTimeConstraints.min}
                max={dateTimeConstraints.max}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Arrival</label>
              <input
                type="datetime-local"
                value={formData.arrival_datetime}
                onChange={(e) => updateField('arrival_datetime', e.target.value)}
                min={dateTimeConstraints.min}
                max={dateTimeConstraints.max}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
              />
              {formData.departure_datetime && formData.arrival_datetime && (
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {calculateDuration().hours}h {calculateDuration().minutes}m
                </p>
              )}
            </div>
          </>
        )}

        {/* Duration Mode: Departure + Duration */}
        {dateInputMode === 'duration' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Departure</label>
              <input
                type="datetime-local"
                value={formData.departure_datetime}
                onChange={(e) => {
                  updateField('departure_datetime', e.target.value);
                  // Recalculate arrival when departure changes
                  if (e.target.value && (durationHours > 0 || durationMinutes > 0)) {
                    const arrival = calculateArrival(e.target.value, durationHours, durationMinutes);
                    updateField('arrival_datetime', arrival);
                  }
                }}
                min={dateTimeConstraints.min}
                max={dateTimeConstraints.max}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Journey Duration</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={durationHours}
                      onChange={(e) => handleJourneyDurationChange(parseInt(e.target.value) || 0, durationMinutes)}
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                      placeholder="0"
                    />
                    <span className="ml-2 text-sm text-gray-600">hours</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationMinutes}
                      onChange={(e) => handleJourneyDurationChange(durationHours, parseInt(e.target.value) || 0)}
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                      placeholder="0"
                    />
                    <span className="ml-2 text-sm text-gray-600">minutes</span>
                  </div>
                </div>
              </div>
              {formData.departure_datetime && (durationHours > 0 || durationMinutes > 0) && (
                <p className="text-xs text-gray-500 mt-1">
                  Arrival: {formData.arrival_datetime ? new Date(formData.arrival_datetime).toLocaleString('en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }) : 'N/A'}
                </p>
              )}
            </div>
          </>
        )}

        {/* Validation Messages */}
        {(errors.departure_arrival || warnings.outside_trip_dates) && (
          <div className="md:col-span-2 space-y-2">
            {errors.departure_arrival && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.departure_arrival}</span>
              </div>
            )}
            {warnings.outside_trip_dates && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{warnings.outside_trip_dates}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Cost <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.cost || ''}
              onChange={(e) =>
                updateField(
                  'cost',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder="0.00"
              step="0.01"
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
            />
            <select
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 px-3 py-2.5 shadow-xs"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="JPY">JPY</option>
              <option value="CHF">CHF</option>
              <option value="CNY">CNY</option>
              <option value="INR">INR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Booking Reference <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.booking_reference}
            onChange={(e) => updateField('booking_reference', e.target.value)}
            placeholder="e.g., ABC123"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>

        {/* Booking Status Section */}
        {modeCapabilities.canHaveBookingStatus && (
          <div className="md:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">Booking Status</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_booked !== false}
                    onChange={(e) => updateField('is_booked', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-primary-500/20"
                  />
                  <span className="text-sm font-medium text-gray-700">Already Booked</span>
                </label>
              </div>

              {modeCapabilities.hint && (
                <p className="text-xs text-slate-500 mb-3">
                  {modeCapabilities.hint}
                </p>
              )}

            {!formData.is_booked && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                {/* Flexibility Level */}
                {modeCapabilities.canBeFlexible && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Flexibility</label>
                    <select
                      value={formData.flexibility_level || 'exact'}
                      onChange={(e) => updateField('flexibility_level', e.target.value as 'exact' | 'flexible' | 'very_flexible')}
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                    >
                      <option value="exact">Exact time - reserved, fixed schedule</option>
                      <option value="flexible">Flexible - multiple departures, choose closer to trip</option>
                      <option value="very_flexible">Very flexible - on-demand, frequent service</option>
                    </select>
                  </div>
                )}

                {/* Frequency */}
                {modeCapabilities.canHaveFrequency && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Frequency <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.frequency || ''}
                      onChange={(e) => updateField('frequency', e.target.value)}
                      placeholder="e.g., Every 30 minutes, Hourly"
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* Booking Opens Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Booking Opens <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.booking_opens_date || ''}
                    onChange={(e) => updateField('booking_opens_date', e.target.value)}
                    max={dateTimeConstraints.max?.split('T')[0]}
                    className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                  />
                </div>

                {/* Booking Deadline */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Book By <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.booking_deadline || ''}
                    onChange={(e) => updateField('booking_deadline', e.target.value)}
                    max={dateTimeConstraints.max?.split('T')[0]}
                    className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Booking Options Panel (for editing existing unbooked journeys) */}
        {isEditing && editingId && !formData.is_booked && modeCapabilities.canHaveBookingOptions && (
          <div className="md:col-span-2 mt-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Booking Options</h4>
              <p className="text-xs text-slate-500 mb-4">
                Compare different transfers and booking options before selecting one.
              </p>
              <JourneyOptionsPanel
                journeyId={editingId}
                options={journeyOptions.options}
                onAddOption={journeyOptions.addOption}
                onUpdateOption={journeyOptions.updateOption}
                onDeleteOption={journeyOptions.deleteOption}
                onSelectOption={journeyOptions.selectOption}
              />
            </div>
          </div>
        )}
      </div>

      {/* Layovers Section (flights only) */}
      {modeCapabilities.canHaveLayovers && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-800">Layovers</h4>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'Manage layovers for this flight.'
                : 'Add layovers now. They will be saved after the journey is created.'}
            </p>
          </div>
          {isEditing && editingId ? (
            <LayoverList journeyId={editingId} />
          ) : (
            <LayoverDraftList layovers={draftLayovers} onChange={setDraftLayovers} />
          )}
        </div>
      )}

      {/* Route Details Section (expandable, for ground transport) */}
      {modeCapabilities.canHaveRouteDetails && (
        <div className="mt-4 border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setShowRouteDetails(!showRouteDetails)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">Route Details</span>
              <span className="text-sm text-gray-400">(optional)</span>
            </div>
            {showRouteDetails ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showRouteDetails && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
              {/* Distance */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Distance</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formData.distance_miles || ''}
                      onChange={(e) => updateField('distance_miles', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                      step="0.1"
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                    />
                    <span className="text-xs text-gray-500 mt-1">miles</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formData.distance_km || ''}
                      onChange={(e) => updateField('distance_km', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                      step="0.1"
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                    />
                    <span className="text-xs text-gray-500 mt-1">km</span>
                  </div>
                </div>
              </div>

              {/* Estimated Duration */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Driving Time (without stops)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={durationParts.hours}
                    onChange={(e) => handleDurationChange(e.target.value, durationParts.mins)}
                    placeholder="0"
                    min="0"
                    className="w-20 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                  />
                  <span className="text-sm text-gray-600">h</span>
                  <input
                    type="number"
                    value={durationParts.mins}
                    onChange={(e) => handleDurationChange(durationParts.hours, e.target.value)}
                    placeholder="0"
                    min="0"
                    max="59"
                    className="w-20 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                  />
                  <span className="text-sm text-gray-600">min</span>
                </div>
              </div>

              {/* Route Type */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Route Type</label>
                <select
                  value={formData.route_type || ''}
                  onChange={(e) => updateField('route_type', e.target.value as RouteType || undefined)}
                  className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                >
                  <option value="">Not specified</option>
                  {routeTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tolls */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tolls</label>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.has_tolls || false}
                      onChange={(e) => updateField('has_tolls', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Has toll roads</span>
                  </label>
                  {formData.has_tolls && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">{formData.currency || 'USD'}</span>
                      <input
                        type="number"
                        value={formData.toll_cost || ''}
                        onChange={(e) => updateField('toll_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.00"
                        step="0.01"
                        className="w-24 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block px-3 py-2 shadow-xs placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Route Notes */}
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Route Notes</label>
                <textarea
                  value={formData.route_notes || ''}
                  onChange={(e) => updateField('route_notes', e.target.value || undefined)}
                  placeholder="e.g., Take I-70 through Glenwood Canyon for scenic views"
                  rows={2}
                  className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <select
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 px-3 py-1.5 shadow-xs"
          >
            <option value="planned">Planned</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {isEditing ? 'Update Journey' : 'Add Journey'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
