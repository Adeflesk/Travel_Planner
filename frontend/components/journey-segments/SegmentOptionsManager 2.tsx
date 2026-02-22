'use client';

import { useState } from 'react';
import { SegmentOption, SegmentOptionFormData, SegmentOptionStatus } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Check, X, Clock, DollarSign } from 'lucide-react';

interface SegmentOptionsManagerProps {
  segmentId: number;
  options: SegmentOption[];
  onAddOption: (option: SegmentOptionFormData) => Promise<void>;
  onUpdateOption: (optionId: number, updates: Partial<SegmentOptionFormData>) => Promise<void>;
  onDeleteOption: (optionId: number) => Promise<void>;
}

const statusOptions: Array<{ value: SegmentOptionStatus; label: string; color: string }> = [
  { value: 'researching', label: 'Researching', color: 'text-gray-600 bg-gray-100' },
  { value: 'selected', label: 'Selected', color: 'text-green-600 bg-green-100' },
  { value: 'booked', label: 'Booked', color: 'text-blue-600 bg-blue-100' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-600 bg-red-100' },
];

const getStatusBadge = (status: SegmentOptionStatus) => {
  const config = statusOptions.find((opt) => opt.value === status);
  if (!config) return null;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${config.color}`}>
      {config.label}
    </span>
  );
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

export function SegmentOptionsManager({
  segmentId,
  options,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: SegmentOptionsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SegmentOptionFormData>({
    segment_id: segmentId,
    name: '',
    provider: '',
    frequency: '',
    estimated_duration: undefined,
    cost: undefined,
    currency: 'USD',
    booking_url: '',
    notes: '',
    status: 'researching',
    order: options.length,
  });

  const resetForm = () => {
    setFormData({
      segment_id: segmentId,
      name: '',
      provider: '',
      frequency: '',
      estimated_duration: undefined,
      cost: undefined,
      currency: 'USD',
      booking_url: '',
      notes: '',
      status: 'researching',
      order: options.length,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingId) {
        await onUpdateOption(editingId, formData);
      } else {
        await onAddOption(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving segment option:', error);
      alert('Failed to save option');
    }
  };

  const startEdit = (option: SegmentOption) => {
    setEditingId(option.id);
    setFormData({
      segment_id: option.segment_id,
      name: option.name,
      provider: option.provider || '',
      frequency: option.frequency || '',
      estimated_duration: option.estimated_duration,
      cost: option.cost,
      currency: option.currency,
      booking_url: option.booking_url || '',
      notes: option.notes || '',
      status: option.status,
      order: option.order,
    });
    setIsAdding(true);
  };

  const handleDelete = async (optionId: number) => {
    if (!confirm('Delete this transport option?')) return;
    try {
      await onDeleteOption(optionId);
    } catch (error) {
      console.error('Error deleting segment option:', error);
      alert('Failed to delete option');
    }
  };

  const handleSelectOption = async (option: SegmentOption) => {
    try {
      await onUpdateOption(option.id, {
        status: option.status === 'selected' ? 'researching' : 'selected',
      });
    } catch (error) {
      console.error('Error updating segment option:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Transport Options</h4>
        {!isAdding && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            + Add Option
          </Button>
        )}
      </div>

      {options.length === 0 && !isAdding && (
        <p className="text-sm text-slate-500 italic">
          No transport options yet. Add options to compare providers.
        </p>
      )}

      {/* Options List */}
      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.id}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-semibold text-slate-900">{option.name}</h5>
                  {getStatusBadge(option.status)}
                </div>
                {option.provider && (
                  <p className="text-sm text-slate-600">{option.provider}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                  {option.frequency && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {option.frequency}
                    </span>
                  )}
                  {option.estimated_duration && (
                    <span>⏱️ {formatDuration(option.estimated_duration)}</span>
                  )}
                  {option.cost && (
                    <span className="font-medium text-slate-900 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {option.cost} {option.currency}
                    </span>
                  )}
                </div>
                {option.notes && (
                  <p className="text-xs text-slate-500 mt-2">{option.notes}</p>
                )}
                {option.booking_url && (
                  <a
                    href={option.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    🔗 Booking link
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  className={`p-1 rounded hover:bg-green-100 ${
                    option.status === 'selected' ? 'text-green-600' : 'text-gray-400'
                  }`}
                  title={option.status === 'selected' ? 'Unselect' : 'Select this option'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(option)}
                >
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => handleDelete(option.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-300 bg-slate-50 p-4 space-y-3">
          <h5 className="font-semibold text-slate-900">
            {editingId ? 'Edit Option' : 'Add Transport Option'}
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Airlink Express"
              required
            />
            <Input
              label="Provider"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., Dublin Bus"
            />
            <Input
              label="Frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              placeholder="e.g., Every 15 min"
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.estimated_duration || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimated_duration: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="30"
            />
            <Input
              label="Cost"
              type="number"
              step="0.01"
              value={formData.cost || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cost: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="7.50"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as SegmentOptionStatus })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Booking URL"
            value={formData.booking_url}
            onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
            placeholder="https://..."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Pros/cons, booking details..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Update' : 'Add'} Option</Button>
          </div>
        </form>
      )}
    </div>
  );
}
