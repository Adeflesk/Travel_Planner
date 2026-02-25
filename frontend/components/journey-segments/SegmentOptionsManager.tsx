'use client';

import { useEffect, useState } from 'react';
import { SegmentOption, SegmentOptionFormData, SegmentOptionStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';

interface SegmentOptionsManagerProps {
  segmentId: number;
  options: SegmentOption[];
  onAddOption: (data: SegmentOptionFormData) => Promise<void>;
  onUpdateOption: (optionId: number, updates: Partial<SegmentOptionFormData>) => Promise<void>;
  onDeleteOption: (optionId: number) => Promise<void>;
}

const statusOptions: SegmentOptionStatus[] = [
  'researching',
  'selected',
  'booked',
  'rejected',
];

const emptyForm = (segmentId: number): SegmentOptionFormData => ({
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
  order: 0,
});

export function SegmentOptionsManager({
  segmentId,
  options,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: SegmentOptionsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SegmentOptionFormData>(
    emptyForm(segmentId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingId === null) {
      setFormData(emptyForm(segmentId));
    }
  }, [segmentId, editingId]);

  const openAddForm = () => {
    setError(null);
    setEditingId(null);
    setFormData({
      ...emptyForm(segmentId),
      order: options.length,
    });
    setShowForm(true);
  };

  const openEditForm = (option: SegmentOption) => {
    setError(null);
    setEditingId(option.id);
    setFormData({
      segment_id: option.segment_id,
      name: option.name,
      provider: option.provider ?? '',
      frequency: option.frequency ?? '',
      estimated_duration: option.estimated_duration ?? undefined,
      cost: option.cost ?? undefined,
      currency: option.currency ?? 'USD',
      booking_url: option.booking_url ?? '',
      notes: option.notes ?? '',
      status: option.status,
      order: option.order,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm(segmentId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Option name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: SegmentOptionFormData = {
        ...formData,
        provider: formData.provider || undefined,
        frequency: formData.frequency || undefined,
        booking_url: formData.booking_url || undefined,
        notes: formData.notes || undefined,
        estimated_duration:
          formData.estimated_duration === undefined || formData.estimated_duration === null
            ? undefined
            : Number(formData.estimated_duration),
        cost:
          formData.cost === undefined || formData.cost === null
            ? undefined
            : Number(formData.cost),
      };

      if (editingId === null) {
        await onAddOption(payload);
      } else {
        await onUpdateOption(editingId, payload);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save option');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Transport Options</div>
          <div className="text-xs text-slate-500">
            Compare alternatives for this segment
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={openAddForm}>
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              {editingId === null ? 'New Option' : 'Edit Option'}
            </div>
            <button type="button" onClick={closeForm} className="text-slate-500 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Option name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g., Airlink Express"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Provider
              </label>
              <input
                type="text"
                value={formData.provider ?? ''}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Dublin Bus"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Frequency
              </label>
              <input
                type="text"
                value={formData.frequency ?? ''}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Every 15 min"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={formData.estimated_duration ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_duration: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cost
              </label>
              <input
                type="number"
                value={formData.cost ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cost: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                step="0.01"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={formData.currency ?? 'USD'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Status
              </label>
              <select
                value={formData.status ?? 'researching'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as SegmentOptionStatus,
                  })
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Booking URL
              </label>
              <input
                type="url"
                value={formData.booking_url ?? ''}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes ?? ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSaving}>
              {editingId === null ? 'Add option' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}

      {options.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
          No options yet.
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={option.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {option.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {option.provider || 'Unknown provider'}
                    {option.frequency ? ` · ${option.frequency}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {option.status}
                    {option.cost !== undefined && option.cost !== null
                      ? ` · ${option.cost.toFixed(2)} ${option.currency}`
                      : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditForm(option)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteOption(option.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {option.notes && (
                <div className="mt-2 text-xs text-slate-500">{option.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
