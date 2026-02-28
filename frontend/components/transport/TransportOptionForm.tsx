'use client';

import { useState } from 'react';
import { TransportOption, TransportOptionCreate, TransportOptionStatus, TransportType } from '@/lib/types';
import { useTripCurrency } from '@/lib/trip-context';

interface TransportOptionFormProps {
  transportType: TransportType;
  initialData?: Partial<TransportOption>;
  onSave: (data: TransportOptionCreate) => void;
  onCancel: () => void;
}

export function TransportOptionForm({ transportType, initialData, onSave, onCancel }: TransportOptionFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [carrier, setCarrier] = useState(initialData?.carrier ?? '');
  const [duration, setDuration] = useState(initialData?.duration_minutes?.toString() ?? '');
  const [cost, setCost] = useState(initialData?.cost?.toString() ?? '');
  const tripCurrency = useTripCurrency();
  const [currency, setCurrency] = useState(initialData?.currency ?? tripCurrency);
  const [frequency, setFrequency] = useState(initialData?.frequency ?? '');
  const [bookingUrl, setBookingUrl] = useState(initialData?.booking_url ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [status, setStatus] = useState<TransportOptionStatus>(initialData?.status ?? 'researching');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: TransportOptionCreate = {
      transport_type: transportType,
      name,
      status,
    };
    if (carrier) data.carrier = carrier;
    if (duration) data.duration_minutes = parseInt(duration, 10);
    if (cost) data.cost = parseFloat(cost);
    if (currency) data.currency = currency;
    if (frequency) data.frequency = frequency;
    if (bookingUrl) data.booking_url = bookingUrl;
    if (notes) data.notes = notes;
    onSave(data);
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300';

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Renfe AVE, FlixBus Express" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Carrier</label>
          <input className={inputCls} value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Operator name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Duration (min)</label>
          <input className={inputCls} type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 270" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Cost</label>
          <input className={inputCls} type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
          <input className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)} placeholder="USD" maxLength={10} />
        </div>
      </div>
      {(transportType === 'train' || transportType === 'bus' || transportType === 'ferry') && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
          <input className={inputCls} value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g. every 2 hours, 3x daily" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Booking URL</label>
        <input className={inputCls} type="url" value={bookingUrl} onChange={e => setBookingUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
        <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as TransportOptionStatus)}>
          <option value="researching">Researching</option>
          <option value="selected">Selected</option>
          <option value="booked">Booked</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 px-3 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">
          Save
        </button>
        <button type="button" onClick={onCancel} className="flex-1 px-3 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
