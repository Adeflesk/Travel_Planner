'use client';

import { useState, useEffect } from 'react';
import { JourneyStop } from '@/lib/types';
import { X } from 'lucide-react';
import { useTripContext } from '@/lib/trip-context';
import { getDateTimeConstraints } from '@/lib/date-constraints';

interface JourneyStopFormProps {
  journeyId: number;
  stop?: JourneyStop | null;
  onSubmit: (data: Partial<JourneyStop>) => Promise<void>;
  onCancel: () => void;
}

export function JourneyStopForm({
  journeyId,
  stop,
  onSubmit,
  onCancel,
}: JourneyStopFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    planned_arrival: '',
    planned_departure: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Get trip context for date constraints
  const tripContext = useTripContext();
  
  const dateTimeConstraints = getDateTimeConstraints(
    tripContext?.startDate,
    tripContext?.endDate,
    {
      allowBeforeStart: true,
      allowAfterEnd: true,
      defaultTo: 'start',
      defaultTime: '09:00',
    }
  );

  useEffect(() => {
    if (stop) {
      setFormData({
        name: stop.name || '',
        location: stop.location || '',
        planned_arrival: stop.planned_arrival
          ? new Date(stop.planned_arrival).toISOString().slice(0, 16)
          : '',
        planned_departure: stop.planned_departure
          ? new Date(stop.planned_departure).toISOString().slice(0, 16)
          : '',
        notes: stop.notes || '',
      });
    }
  }, [stop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        journey_id: journeyId,
        name: formData.name,
        location: formData.location || undefined,
        planned_arrival: formData.planned_arrival || undefined,
        planned_departure: formData.planned_departure || undefined,
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
          {stop ? 'Edit Stop' : 'Add Stop'}
        </h4>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stop Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Glenwood Springs"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location / Address
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., 123 Main St, Glenwood Springs, CO"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planned Arrival
            </label>
            <input
              type="datetime-local"
              value={formData.planned_arrival}
              onChange={(e) =>
                setFormData({ ...formData, planned_arrival: e.target.value })
              }
              min={dateTimeConstraints.min}
              max={dateTimeConstraints.max}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planned Departure
            </label>
            <input
              type="datetime-local"
              value={formData.planned_departure}
              onChange={(e) =>
                setFormData({ ...formData, planned_departure: e.target.value })
              }
              min={dateTimeConstraints.min}
              max={dateTimeConstraints.max}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Any notes about this stop"
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
            type="submit"
            disabled={submitting || !formData.name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : stop ? 'Update Stop' : 'Add Stop'}
          </button>
        </div>
      </form>
    </div>
  );
}
