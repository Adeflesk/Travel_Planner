'use client';

import { useState, useEffect } from 'react';
import { StopOption, StopOptionType, StopOptionStatus } from '@/lib/types';
import { X } from 'lucide-react';
import { optionTypeLabels } from './useJourneyStops';

interface StopOptionFormProps {
  stopId: number;
  option?: StopOption | null;
  onSubmit: (data: Partial<StopOption>) => Promise<void>;
  onCancel: () => void;
}

const optionTypes: StopOptionType[] = [
  'activity',
  'meal',
  'sightseeing',
  'rest',
  'fuel',
  'shopping',
  'other',
];

const statusOptions: StopOptionStatus[] = [
  'considering',
  'selected',
  'skipped',
  'done',
];

export function StopOptionForm({
  stopId,
  option,
  onSubmit,
  onCancel,
}: StopOptionFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    option_type: 'other' as StopOptionType,
    estimated_duration: '',
    estimated_cost: '',
    currency: 'USD',
    url: '',
    notes: '',
    status: 'considering' as StopOptionStatus,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (option) {
      setFormData({
        name: option.name || '',
        description: option.description || '',
        option_type: option.option_type || 'other',
        estimated_duration: option.estimated_duration?.toString() || '',
        estimated_cost: option.estimated_cost?.toString() || '',
        currency: option.currency || 'USD',
        url: option.url || '',
        notes: option.notes || '',
        status: option.status || 'considering',
      });
    }
  }, [option]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        stop_id: stopId,
        name: formData.name,
        description: formData.description || undefined,
        option_type: formData.option_type,
        estimated_duration: formData.estimated_duration
          ? parseInt(formData.estimated_duration)
          : undefined,
        estimated_cost: formData.estimated_cost
          ? parseFloat(formData.estimated_cost)
          : undefined,
        currency: formData.currency,
        url: formData.url || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-800">
          {option ? 'Edit Option' : 'Add Option'}
        </h4>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., Riverside Cafe, Scenic Overlook"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.option_type}
              onChange={(e) =>
                setFormData({ ...formData, option_type: e.target.value as StopOptionType })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {optionTypes.map((type) => (
                <option key={type} value={type}>
                  {optionTypeLabels[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as StopOptionStatus })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Brief description of this option"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.estimated_duration}
              onChange={(e) =>
                setFormData({ ...formData, estimated_duration: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., 30"
              min="0"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Est. Cost
              </label>
              <input
                type="number"
                value={formData.estimated_cost}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_cost: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="w-20">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                maxLength={3}
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL / Link
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Any additional notes"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !formData.name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : option ? 'Update' : 'Add Option'}
          </button>
        </div>
      </form>
    </div>
  );
}
