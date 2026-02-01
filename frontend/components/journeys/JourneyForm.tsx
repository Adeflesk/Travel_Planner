'use client';

import { JourneyFormData, Destination } from '@/lib/types';
import { transportModes } from './useJourneys';
import { ValidationErrors, ValidationWarnings } from './useJourneyForm';
import { AlertCircle, AlertTriangle } from 'lucide-react';

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
