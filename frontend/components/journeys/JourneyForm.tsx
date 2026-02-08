'use client';

import { useState } from 'react';
import { JourneyFormData, Destination, RouteType } from '@/lib/types';
import { transportModes } from './useJourneys';
import { ValidationErrors, ValidationWarnings } from './useJourneyForm';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Route } from 'lucide-react';

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
  destinations: Destination[];
  errors?: ValidationErrors;
  warnings?: ValidationWarnings;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof JourneyFormData>(
    field: K,
    value: JourneyFormData[K]
  ) => void;
}

export function JourneyForm({
  formData,
  isEditing,
  destinations,
  errors = {},
  warnings = {},
  onSubmit,
  onCancel,
  updateField,
}: JourneyFormProps) {
  const [showRouteDetails, setShowRouteDetails] = useState(
    // Auto-expand if route details exist
    !!(formData.distance_km || formData.distance_miles || formData.estimated_duration_minutes || formData.route_type || formData.has_tolls || formData.toll_cost || formData.route_notes)
  );

  // Route details are primarily for ground transport
  const canHaveRouteDetails = ['car', 'bus', 'train'].includes(formData.transport_mode);

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
            onChange={(e) => updateField('transport_mode', e.target.value)}
            required
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select Transport</option>
            {transportModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Carrier <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.carrier}
            onChange={(e) => updateField('carrier', e.target.value)}
            placeholder="e.g., British Airways, Eurostar"
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
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
              } else if (value) {
                updateField('origin_id', parseInt(value));
                updateField('origin_name', undefined);
              } else {
                updateField('origin_id', undefined);
                updateField('origin_name', undefined);
              }
            }}
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select Origin</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
                {dest.country ? `, ${dest.country}` : ''}
              </option>
            ))}
            <option value="other">📍 Other Location (e.g., Home Airport)</option>
          </select>
          {formData.origin_name !== undefined && (
            <input
              type="text"
              value={formData.origin_name || ''}
              onChange={(e) => updateField('origin_name', e.target.value)}
              placeholder="e.g., Dublin Airport (DUB)"
              className="mt-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
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
              } else if (value) {
                updateField('destination_id', parseInt(value));
                updateField('destination_name', undefined);
              } else {
                updateField('destination_id', undefined);
                updateField('destination_name', undefined);
              }
            }}
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select Destination</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
                {dest.country ? `, ${dest.country}` : ''}
              </option>
            ))}
            <option value="other">📍 Other Location (e.g., Home Airport)</option>
          </select>
          {formData.destination_name !== undefined && (
            <input
              type="text"
              value={formData.destination_name || ''}
              onChange={(e) => updateField('destination_name', e.target.value)}
              placeholder="e.g., Dublin Airport (DUB)"
              className="mt-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Departure</label>
          <input
            type="datetime-local"
            value={formData.departure_datetime}
            onChange={(e) => updateField('departure_datetime', e.target.value)}
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Arrival</label>
          <input
            type="datetime-local"
            value={formData.arrival_datetime}
            onChange={(e) => updateField('arrival_datetime', e.target.value)}
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
          />
        </div>

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
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
            <select
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs"
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
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
          />
        </div>
      </div>

      {/* Route Details Section (expandable, for ground transport) */}
      {canHaveRouteDetails && (
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
                      className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
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
                      className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
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
                    className="w-20 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block px-3 py-2.5 shadow-xs placeholder:text-body"
                  />
                  <span className="text-sm text-gray-600">h</span>
                  <input
                    type="number"
                    value={durationParts.mins}
                    onChange={(e) => handleDurationChange(durationParts.hours, e.target.value)}
                    placeholder="0"
                    min="0"
                    max="59"
                    className="w-20 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block px-3 py-2.5 shadow-xs placeholder:text-body"
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
                  className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
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
                        className="w-24 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block px-3 py-2 shadow-xs placeholder:text-body"
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
                  className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body resize-none"
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
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-1.5 shadow-xs"
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
