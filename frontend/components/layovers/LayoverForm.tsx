'use client';

import { useState, useEffect } from 'react';
import { FlightLayover, FlightLayoverFormData } from '@/lib/types';
import { X } from 'lucide-react';

interface LayoverFormProps {
  journeyId: number;
  layover?: FlightLayover | null;
  onSubmit: (data: FlightLayoverFormData) => Promise<void>;
  onCancel: () => void;
}

export function LayoverForm({
  journeyId,
  layover,
  onSubmit,
  onCancel,
}: LayoverFormProps) {
  const [formData, setFormData] = useState({
    airport_name: '',
    airport_code: '',
    terminal: '',
    gate: '',
    arrival_datetime: '',
    departure_datetime: '',
    connecting_flight_number: '',
    connecting_airline: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (layover) {
      setFormData({
        airport_name: layover.airport_name || '',
        airport_code: layover.airport_code || '',
        terminal: layover.terminal || '',
        gate: layover.gate || '',
        arrival_datetime: layover.arrival_datetime
          ? new Date(layover.arrival_datetime).toISOString().slice(0, 16)
          : '',
        departure_datetime: layover.departure_datetime
          ? new Date(layover.departure_datetime).toISOString().slice(0, 16)
          : '',
        connecting_flight_number: layover.connecting_flight_number || '',
        connecting_airline: layover.connecting_airline || '',
        notes: layover.notes || '',
      });
    }
  }, [layover]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        journey_id: journeyId,
        airport_name: formData.airport_name,
        airport_code: formData.airport_code || undefined,
        terminal: formData.terminal || undefined,
        gate: formData.gate || undefined,
        arrival_datetime: formData.arrival_datetime || undefined,
        departure_datetime: formData.departure_datetime || undefined,
        connecting_flight_number: formData.connecting_flight_number || undefined,
        connecting_airline: formData.connecting_airline || undefined,
        notes: formData.notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-800">
          {layover ? 'Edit Layover' : 'Add Layover'}
        </h4>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Airport Name *
            </label>
            <input
              type="text"
              value={formData.airport_name}
              onChange={(e) =>
                setFormData({ ...formData, airport_name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., London Heathrow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Airport Code (IATA)
            </label>
            <input
              type="text"
              value={formData.airport_code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  airport_code: e.target.value.toUpperCase(),
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., LHR"
              maxLength={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terminal
            </label>
            <input
              type="text"
              value={formData.terminal}
              onChange={(e) =>
                setFormData({ ...formData, terminal: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., Terminal 5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gate
            </label>
            <input
              type="text"
              value={formData.gate}
              onChange={(e) =>
                setFormData({ ...formData, gate: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., B42"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arrival at Layover
            </label>
            <input
              type="datetime-local"
              value={formData.arrival_datetime}
              onChange={(e) =>
                setFormData({ ...formData, arrival_datetime: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure from Layover
            </label>
            <input
              type="datetime-local"
              value={formData.departure_datetime}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  departure_datetime: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connecting Flight #
            </label>
            <input
              type="text"
              value={formData.connecting_flight_number}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connecting_flight_number: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., BA456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connecting Airline
            </label>
            <input
              type="text"
              value={formData.connecting_airline}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connecting_airline: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., British Airways"
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              placeholder="e.g., Lounge access available, terminal change required"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !formData.airport_name}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            {submitting
              ? 'Saving...'
              : layover
                ? 'Update Layover'
                : 'Add Layover'}
          </button>
        </div>
      </div>
    </div>
  );
}
