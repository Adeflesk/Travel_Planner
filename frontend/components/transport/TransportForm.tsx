'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { TripTransport, TripTransportCreate, TripTransportUpdate, TransportType, TripDay } from '@/lib/types';
import { useTripCurrency } from '@/lib/trip-context';
import { TRANSPORT_CONFIG } from '@/lib/transport-config';

interface TransportFormProps {
  tripDays: TripDay[];
  defaultDayId?: number;
  initialData?: TripTransport;
  onSave: (data: TripTransportCreate | TripTransportUpdate) => void;
  onDelete?: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

const TRANSPORT_TYPES: { value: TransportType; label: string; icon: string }[] = [
  { value: 'flight', label: 'Flight', icon: '✈' },
  { value: 'train', label: 'Train', icon: '🚆' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'drive', label: 'Drive', icon: '🚗' },
  { value: 'ferry', label: 'Ferry', icon: '⛴' },
  { value: 'other', label: 'Other', icon: '🚀' },
];

function formatDayLabel(day: TripDay): string {
  const d = new Date(day.date + 'T00:00:00');
  const label = day.title || day.location || '';
  return `${d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}${label ? ` · ${label}` : ''}`;
}

export function TransportForm({
  tripDays,
  defaultDayId,
  initialData,
  onSave,
  onDelete,
  onClose,
  isSubmitting,
}: TransportFormProps) {
  const [type, setType] = useState<TransportType>(initialData?.transport_type ?? 'flight');
  const [origin, setOrigin] = useState(initialData?.origin ?? '');
  const [destination, setDestination] = useState(initialData?.destination ?? '');
  const [depDayId, setDepDayId] = useState<string>(
    initialData?.departure_day_id?.toString() ?? defaultDayId?.toString() ?? ''
  );
  const [arrDayId, setArrDayId] = useState<string>(
    initialData?.arrival_day_id?.toString() ?? defaultDayId?.toString() ?? ''
  );
  const [depTime, setDepTime] = useState(initialData?.departure_time ?? '');
  const [arrTime, setArrTime] = useState(initialData?.arrival_time ?? '');
  const [carrier, setCarrier] = useState(initialData?.carrier ?? '');
  const [reference, setReference] = useState(initialData?.reference ?? '');
  const [cost, setCost] = useState(initialData?.cost?.toString() ?? '');
  const tripCurrency = useTripCurrency();
  const [currency, setCurrency] = useState(initialData?.currency ?? tripCurrency);
  const [booked, setBooked] = useState(initialData?.booked ?? false);
  const [overnight, setOvernight] = useState(initialData?.overnight ?? false);
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  // Type-specific extras (stored in `extra` JSON field)
  const [distanceKm, setDistanceKm] = useState(
    (initialData?.extra?.distance_km as string) ?? ''
  );
  const [frequency, setFrequency] = useState(
    (initialData?.extra?.frequency as string) ?? ''
  );
  const [tolls, setTolls] = useState<boolean>((initialData?.extra?.tolls as boolean) ?? false);

  const cfg = TRANSPORT_CONFIG[type] ?? TRANSPORT_CONFIG['other'];

  const advanceArrToNextDay = (fromDayId: string) => {
    if (!fromDayId) return;
    const depDay = tripDays.find(d => d.id === parseInt(fromDayId, 10));
    if (!depDay) return;
    const depIndex = tripDays.indexOf(depDay);
    const nextDay = tripDays[depIndex + 1];
    if (nextDay) setArrDayId(nextDay.id.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extra: Record<string, unknown> = {};
    if (cfg.showDistance && distanceKm) extra.distance_km = parseFloat(distanceKm);
    if (cfg.showFrequency && frequency) extra.frequency = frequency;
    if (cfg.showTolls) extra.tolls = tolls;

    const data: TripTransportCreate = {
      transport_type: type,
      origin,
      destination,
      departure_day_id: depDayId ? parseInt(depDayId, 10) : undefined,
      arrival_day_id: arrDayId ? parseInt(arrDayId, 10) : undefined,
      departure_time: depTime || undefined,
      arrival_time: arrTime || undefined,
      carrier: carrier || undefined,
      reference: reference || undefined,
      cost: cost ? parseFloat(cost) : undefined,
      currency: currency || undefined,
      booked,
      overnight,
      notes: notes || undefined,
      extra: Object.keys(extra).length ? extra : undefined,
    };
    onSave(data);
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Transport' : 'Add Transport'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${type === t.value
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                    }`}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Origin / Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From *</label>
              <input className={inputCls} value={origin} onChange={e => setOrigin(e.target.value)} required placeholder="e.g. Sydney (SYD)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To *</label>
              <input className={inputCls} value={destination} onChange={e => setDestination(e.target.value)} required placeholder="e.g. London (LHR)" />
            </div>
          </div>

          {/* Departure day + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Departure day</label>
              <select
                className={inputCls}
                value={depDayId}
                onChange={e => {
                  const newDepId = e.target.value;
                  setDepDayId(newDepId);
                  if (overnight && newDepId) {
                    advanceArrToNextDay(newDepId);
                  }
                }}
              >
                <option value="">— none —</option>
                {tripDays.map(d => (
                  <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Departure time</label>
              <input className={inputCls} type="time" value={depTime} onChange={e => setDepTime(e.target.value)} />
            </div>
          </div>

          {/* Auto-detect overnight nudge */}
          {cfg.overnightSupported && !overnight && depTime && arrTime && arrTime < depTime && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="text-amber-600">⚠</span>
              <span className="text-amber-800 flex-1">Arrival before departure — travelling overnight?</span>
              <button
                type="button"
                onClick={() => {
                  setOvernight(true);
                  advanceArrToNextDay(depDayId);
                }}
                className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 whitespace-nowrap"
              >
                Set overnight
              </button>
            </div>
          )}

          {/* Overnight toggle — only for overnight-capable types */}
          {cfg.overnightSupported && (
            <>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overnight}
                  disabled={!depDayId}
                  onChange={e => {
                    setOvernight(e.target.checked);
                    if (!e.target.checked) {
                      setArrDayId(depDayId);
                    } else {
                      advanceArrToNextDay(depDayId);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm font-medium text-slate-700">Crosses midnight / Overnight</span>
              </label>
              {!depDayId && (
                <p className="text-xs text-slate-400 ml-7">Select a departure day to enable overnight</p>
              )}
            </>
          )}

          {/* Arrival day picker — only when overnight is on */}
          {overnight && cfg.overnightSupported && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arrival day</label>
                <select className={inputCls} value={arrDayId} onChange={e => setArrDayId(e.target.value)}>
                  <option value="">— none —</option>
                  {tripDays.map(d => (
                    <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
                <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* Drive: always show arrival time inline */}
          {!cfg.overnightSupported && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
              <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
            </div>
          )}

          {/* Carrier + Reference — config-driven */}
          {(cfg.showCarrier || cfg.showReference) && (
            <div className={`grid gap-3 ${cfg.showCarrier && cfg.showReference ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {cfg.showCarrier && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {cfg.carrierLabel ?? 'Carrier'}
                  </label>
                  <input
                    className={inputCls}
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder={cfg.carrierPlaceholder ?? ''}
                  />
                </div>
              )}
              {cfg.showReference && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {cfg.referenceLabel ?? 'Reference'}
                  </label>
                  <input
                    className={inputCls}
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder={cfg.referencePlaceholder ?? ''}
                  />
                </div>
              )}
            </div>
          )}

          {/* Cost + currency */}
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

          {/* Type-specific extras — config-driven */}
          {cfg.showDistance && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Distance (km)</label>
              <input
                className={inputCls}
                type="number"
                value={distanceKm}
                onChange={e => setDistanceKm(e.target.value)}
                placeholder="e.g. 450"
              />
            </div>
          )}
          {cfg.showTolls && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tolls}
                onChange={e => setTolls(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm font-medium text-slate-700">Toll roads on this route</span>
            </label>
          )}
          {cfg.showFrequency && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
              <input
                className={inputCls}
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                placeholder="e.g. every 2 hours, 3× daily"
              />
            </div>
          )}

          {/* Booked toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={booked}
              onChange={e => setBooked(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-700">Booked / confirmed</span>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 font-semibold bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {initialData ? 'Save changes' : 'Add transport'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full py-2 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Delete transport
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
