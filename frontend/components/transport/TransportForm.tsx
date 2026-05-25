'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { TripTransport, TripTransportCreate, TripTransportUpdate, TransportType, TripDay, Destination } from '@/lib/types';
import { useTripCurrency, useTripContext } from '@/lib/trip-context';
import { TRANSPORT_CONFIG, TRANSPORT_ICON, TRANSPORT_COLOR, TRANSPORT_LABEL } from '@/lib/transport-config';
import { TransportLocationSearch } from './TransportLocationSearch';
import type { TransportLocation } from './TransportLocationSearch';
import { calculateFlightDuration, formatDuration } from '@/lib/timezone-utils';

interface TransportFormProps {
  tripDays: TripDay[];
  destinations?: Destination[];
  defaultDayId?: number;
  initialData?: TripTransport;
  onSave: (data: TripTransportCreate | TripTransportUpdate) => void;
  onDelete?: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

const ALL_TYPES: TransportType[] = ['flight', 'train', 'bus', 'drive', 'ferry', 'other'];

const TRAVEL_CLASS_OPTIONS: Partial<Record<TransportType, string[]>> = {
  train: ['2nd Class', '1st Class', 'Business'],
  bus: ['Standard', 'Comfort', 'Premium'],
  ferry: ['Deck', 'Cabin', 'Business'],
};

function formatDayLabel(day: TripDay): string {
  const d = new Date(day.date + 'T00:00:00');
  const label = day.title || day.location || '';
  return `${d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}${label ? ` · ${label}` : ''}`;
}

export function TransportForm({
  tripDays,
  destinations,
  defaultDayId,
  initialData,
  onSave,
  onDelete,
  onClose,
  isSubmitting,
}: TransportFormProps) {
  const tripCtxValue = useTripContext();
  const defaultType = tripCtxValue?.tripContext?.vehicle === 'own_car' || tripCtxValue?.tripContext?.vehicle === 'rental' ? 'drive' : 'flight';
  const [type, setType] = useState<TransportType>(initialData?.transport_type ?? defaultType);
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
  const [waypoints, setWaypoints] = useState(initialData?.waypoints ?? '');
  // Type-specific extras (stored in `extra` JSON field)
  const [distanceKm, setDistanceKm] = useState(
    (initialData?.extra?.distance_km as string) ?? ''
  );
  const [frequency, setFrequency] = useState(
    (initialData?.extra?.frequency as string) ?? ''
  );
  const [tolls, setTolls] = useState<boolean>((initialData?.extra?.tolls as boolean) ?? false);

  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(
    initialData?.origin_latitude != null
      ? { lat: initialData.origin_latitude, lng: initialData.origin_longitude! }
      : null
  );
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(
    initialData?.destination_latitude != null
      ? { lat: initialData.destination_latitude, lng: initialData.destination_longitude! }
      : null
  );
  const [prefilledOrigin, setPrefilledOrigin] = useState<string | null>(null);
  const [originTimezone, setOriginTimezone] = useState<string | null>(
    initialData?.origin_timezone ?? null
  );
  const [destTimezone, setDestTimezone] = useState<string | null>(
    initialData?.destination_timezone ?? null
  );
  const [seatClass, setSeatClass] = useState<string>(
    (initialData?.extra?.seat_class as string) ?? 'economy'
  );

  const [travelClass, setTravelClass] = useState<string>(
    (initialData?.extra?.travel_class as string) ?? ''
  );

  const cfg = TRANSPORT_CONFIG[type] ?? TRANSPORT_CONFIG['other'];

  const duration: number | null = (() => {
    if (!depTime || !arrTime) return null;
    const mins = calculateFlightDuration(depTime, arrTime, originTimezone ?? undefined, destTimezone ?? undefined);
    return mins > 0 ? mins : null;
  })();

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
    if (type === 'flight' && seatClass) extra.seat_class = seatClass;
    const travelClassOptions = TRAVEL_CLASS_OPTIONS[type];
    if (travelClassOptions) {
      extra.travel_class = travelClass || travelClassOptions[0];
    }

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
      waypoints: type === 'drive' && waypoints ? waypoints : undefined,
      origin_latitude: originCoords?.lat,
      origin_longitude: originCoords?.lng,
      destination_latitude: destCoords?.lat,
      destination_longitude: destCoords?.lng,
      origin_timezone: originTimezone ?? undefined,
      destination_timezone: destTimezone ?? undefined,
      extra: Object.keys(extra).length ? extra : undefined,
    };
    onSave(data);
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition-colors';
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1';
  const sectionCls = 'rounded-xl bg-slate-50/70 p-4 space-y-3';

  const ActiveIcon = TRANSPORT_ICON[type];
  const activeColor = TRANSPORT_COLOR[type];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
      >
        {/* ── Header with active type icon ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${activeColor}14`, color: activeColor }}
            >
              <ActiveIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? 'Edit Transport' : 'Add Transport'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ═══ Section: Route ═══ */}
          <div className={sectionCls}>
            {/* Type selector */}
            <div>
              <label className={labelCls}>Type</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TYPES.map(t => {
                  const Icon = TRANSPORT_ICON[t];
                  const color = TRANSPORT_COLOR[t];
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        setTravelClass('');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all ${active
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      style={active ? { backgroundColor: color, borderColor: color } : undefined}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {TRANSPORT_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Origin / Destination */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>From *</label>
                <TransportLocationSearch
                  transportType={type}
                  value={origin}
                  placeholder="e.g. London Heathrow"
                  required
                  onChange={(val) => {
                    setOrigin(val);
                    if (val !== prefilledOrigin) {
                      setOriginCoords(null);
                      setOriginTimezone(null);
                      setPrefilledOrigin(null);
                    }
                  }}
                  onSelect={(loc: TransportLocation) => {
                    setOrigin(loc.name);
                    setOriginCoords({ lat: loc.lat, lng: loc.lng });
                    setOriginTimezone(loc.timezone);
                  }}
                />
                {prefilledOrigin && origin === prefilledOrigin && (
                  <p className="text-xs text-sky-600 mt-1">Auto-filled from linked destination</p>
                )}
              </div>
              <div>
                <label className={labelCls}>To *</label>
                <TransportLocationSearch
                  transportType={type}
                  value={destination}
                  placeholder="e.g. New York JFK"
                  required
                  onChange={(val) => {
                    setDestination(val);
                    setDestCoords(null);
                    setDestTimezone(null);
                  }}
                  onSelect={(loc: TransportLocation) => {
                    setDestination(loc.name);
                    setDestCoords({ lat: loc.lat, lng: loc.lng });
                    setDestTimezone(loc.timezone);
                  }}
                />
              </div>
            </div>

            {/* Waypoints — drive only */}
            {type === 'drive' && (
              <div>
                <label className={labelCls}>Intermediate stops (one per line)</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={waypoints}
                  onChange={e => setWaypoints(e.target.value)}
                  placeholder={'Hoover Dam\nOatman, AZ\nSeligman, AZ'}
                />
              </div>
            )}
          </div>

          {/* ═══ Section: Schedule ═══ */}
          <div className={sectionCls}>
            {/* Departure day */}
            <div>
              <label className={labelCls}>Departure day</label>
              <select
                className={inputCls}
                value={depDayId}
                onChange={e => {
                  const newDepId = e.target.value;
                  setDepDayId(newDepId);
                  if (overnight && newDepId) {
                    advanceArrToNextDay(newDepId);
                  }
                  if (newDepId && destinations) {
                    const depDay = tripDays.find(d => d.id === parseInt(newDepId, 10));
                    if (depDay?.destination_id) {
                      const dest = destinations.find(d => d.id === depDay.destination_id);
                      if (dest) {
                        const destLabel = dest.name + (dest.country ? `, ${dest.country}` : '');
                        setOrigin(destLabel);
                        setPrefilledOrigin(destLabel);
                        if (dest.latitude != null && dest.longitude != null) {
                          setOriginCoords({ lat: dest.latitude, lng: dest.longitude });
                        } else {
                          setOriginCoords(null);
                        }
                      }
                    }
                  }
                }}
              >
                <option value="">— none —</option>
                {tripDays.map(d => (
                  <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
                ))}
              </select>
            </div>

            {/* Departure time + Arrival time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Departure time</label>
                <input className={inputCls} type="time" value={depTime} onChange={e => setDepTime(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Arrival time</label>
                <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
              </div>
            </div>

            {/* Duration badge */}
            {duration !== null && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: `${activeColor}10`, color: activeColor }}
              >
                <ActiveIcon className="w-4 h-4" />
                <span>{formatDuration(duration)}</span>
                {originTimezone && destTimezone && originTimezone !== destTimezone && (
                  <span className="text-xs opacity-70 ml-1">(timezone-adjusted)</span>
                )}
              </div>
            )}

            {/* Auto-detect overnight nudge */}
            {cfg.overnightSupported && !overnight && depTime && arrTime && arrTime < depTime && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <span className="text-amber-600 text-base">⚠</span>
                <span className="text-amber-800 flex-1">Arrival before departure — overnight?</span>
                <button
                  type="button"
                  onClick={() => {
                    setOvernight(true);
                    advanceArrToNextDay(depDayId);
                  }}
                  className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 whitespace-nowrap transition-colors"
                >
                  Set overnight
                </button>
              </div>
            )}

            {/* Overnight toggle */}
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
                  <p className="text-xs text-slate-400 ml-7">Select a departure day first</p>
                )}
              </>
            )}

            {/* Arrival day picker — only when overnight */}
            {overnight && cfg.overnightSupported && (
              <div>
                <label className={labelCls}>Arrival day</label>
                <select className={inputCls} value={arrDayId} onChange={e => setArrDayId(e.target.value)}>
                  <option value="">— none —</option>
                  {tripDays.map(d => (
                    <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ═══ Section: Details ═══ */}
          {(cfg.showCarrier || cfg.showReference || type === 'flight' || TRAVEL_CLASS_OPTIONS[type]) && (
            <div className={sectionCls}>
              {/* Carrier + Reference */}
              {(cfg.showCarrier || cfg.showReference) && (
                <div className={`grid gap-3 ${cfg.showCarrier && cfg.showReference ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {cfg.showCarrier && (
                    <div>
                      <label className={labelCls}>{cfg.carrierLabel ?? 'Carrier'}</label>
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
                      <label className={labelCls}>{cfg.referenceLabel ?? 'Reference'}</label>
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

              {/* Seat class — flights */}
              {type === 'flight' && (
                <div>
                  <label className={labelCls}>Seat class</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['economy', 'premium economy', 'business', 'first'] as const).map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSeatClass(cls)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
                          seatClass === cls
                            ? 'text-white border-transparent'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                        style={seatClass === cls ? { backgroundColor: activeColor } : undefined}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Travel class — train, bus, ferry */}
              {TRAVEL_CLASS_OPTIONS[type] && (
                <div>
                  <label className={labelCls}>Travel class</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAVEL_CLASS_OPTIONS[type]!.map((cls) => {
                      const active = (travelClass || TRAVEL_CLASS_OPTIONS[type]![0]) === cls;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setTravelClass(cls)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            active
                              ? 'text-white border-transparent'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                          style={active ? { backgroundColor: activeColor } : undefined}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Section: Cost & extras ═══ */}
          <div className={sectionCls}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cost</label>
                <input className={inputCls} type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <input className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)} placeholder="USD" maxLength={10} />
              </div>
            </div>

            {cfg.showDistance && (
              <div>
                <label className={labelCls}>Distance (km)</label>
                <input className={inputCls} type="number" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} placeholder="e.g. 450" />
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
                <label className={labelCls}>Frequency</label>
                <input className={inputCls} value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g. every 2 hours, 3× daily" />
              </div>
            )}

            {cfg.showBooked && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={booked}
                  onChange={e => setBooked(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-700">Booked / confirmed</span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center gap-3 pt-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Delete transport"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              style={{ backgroundColor: activeColor }}
            >
              {initialData ? 'Save changes' : 'Add transport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
