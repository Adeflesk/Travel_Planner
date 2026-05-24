'use client';

import { useState, useEffect } from 'react';
import { Accommodation, AccommodationCreate, AccommodationUpdate } from '@/lib/types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { X } from 'lucide-react';

interface AccommodationFormProps {
  tripId: number;
  destinationId: number;
  editing?: Accommodation | null;
  onSubmit: (data: AccommodationCreate | AccommodationUpdate) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: AccommodationCreate = {
  destination_id: 0,
  trip_id: 0,
  name: '',
  address: '',
  check_in_date: '',
  check_in_time: '',
  check_out_date: '',
  check_out_time: '',
  cost: undefined,
  currency: 'USD',
  confirmation_number: '',
  booking_url: '',
  contact_phone: '',
  cancellation_policy: '',
  cancel_by_date: '',
  booked: false,
  paid: false,
  notes: '',
};

export function AccommodationForm({
  tripId,
  destinationId,
  editing,
  onSubmit,
  onCancel,
}: AccommodationFormProps) {
  const [form, setForm] = useState<AccommodationCreate>({
    ...EMPTY,
    destination_id: destinationId,
    trip_id: tripId,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        destination_id: destinationId,
        trip_id: tripId,
        name: editing.name,
        address: editing.address ?? '',
        check_in_date: editing.check_in_date,
        check_in_time: editing.check_in_time ?? '',
        check_out_date: editing.check_out_date,
        check_out_time: editing.check_out_time ?? '',
        cost: editing.cost,
        currency: editing.currency ?? 'USD',
        confirmation_number: editing.confirmation_number ?? '',
        booking_url: editing.booking_url ?? '',
        contact_phone: editing.contact_phone ?? '',
        cancellation_policy: editing.cancellation_policy ?? '',
        cancel_by_date: editing.cancel_by_date ?? '',
        booked: editing.booked,
        paid: editing.paid,
        notes: editing.notes ?? '',
      });
    } else {
      setForm({ ...EMPTY, destination_id: destinationId, trip_id: tripId });
    }
  }, [editing, destinationId, tripId]);

  const nights =
    form.check_in_date && form.check_out_date
      ? differenceInCalendarDays(parseISO(form.check_out_date), parseISO(form.check_in_date))
      : null;

  const set = (field: keyof AccommodationCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      (Object.keys(form) as Array<keyof typeof form>).forEach((k) => {
        const v = form[k];
        if (v !== '' && v !== undefined) payload[k] = v;
      });
      await onSubmit(payload as unknown as AccommodationCreate);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">
            {editing ? 'Edit Accommodation' : 'Add Accommodation'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Hotel name or Airbnb"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street address (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Check-in row: date + optional time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.check_in_date}
                onChange={(e) => set('check_in_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in time</label>
              <input
                type="time"
                value={form.check_in_time ?? ''}
                onChange={(e) => set('check_in_time', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Check-out row: date + optional time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.check_out_date}
                onChange={(e) => set('check_out_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out time</label>
              <input
                type="time"
                value={form.check_out_time ?? ''}
                onChange={(e) => set('check_out_time', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {nights !== null && nights > 0 && (
            <p className="text-xs text-blue-600 -mt-2">
              {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost ?? ''}
                onChange={(e) =>
                  set('cost', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input
                value={form.currency ?? 'USD'}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmation Number
            </label>
            <input
              value={form.confirmation_number ?? ''}
              onChange={(e) => set('confirmation_number', e.target.value)}
              placeholder="ABC123"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking URL</label>
            <input
              type="url"
              value={form.booking_url ?? ''}
              onChange={(e) => set('booking_url', e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={form.contact_phone ?? ''}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Policy
            </label>
            <textarea
              value={form.cancellation_policy ?? ''}
              onChange={(e) => set('cancellation_policy', e.target.value)}
              rows={2}
              placeholder="Free cancellation until..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancel By Date</label>
            <input
              type="date"
              value={form.cancel_by_date ?? ''}
              onChange={(e) => set('cancel_by_date', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.booked ?? false}
                onChange={(e) => set('booked', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Booked
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.paid ?? false}
                onChange={(e) => set('paid', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Paid
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Anything else to remember..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Accommodation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
