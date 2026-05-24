'use client';

import { TripTransport } from '@/lib/types';
import { Pencil, Trash2, Check } from 'lucide-react';
import { TransportOptionList } from './TransportOptionList';
import { calculateFlightDuration, formatDuration } from '@/lib/timezone-utils';
import { TRANSPORT_ICON, TRANSPORT_COLOR } from '@/lib/transport-config';

interface TransportItemProps {
  transport: TripTransport;
  currentDayId: number;
  onEdit: (t: TripTransport) => void;
  onDelete: (id: number) => void;
  onReload: () => void;
}

export function TransportItem({ transport, currentDayId, onEdit, onDelete, onReload }: TransportItemProps) {
  const isDeparture = transport.departure_day_id === currentDayId;
  const Icon = TRANSPORT_ICON[transport.transport_type] ?? TRANSPORT_ICON.other;
  const color = TRANSPORT_COLOR[transport.transport_type] ?? TRANSPORT_COLOR.other;

  const duration: number | null = (() => {
    if (!transport.departure_time || !transport.arrival_time) return null;
    const mins = calculateFlightDuration(
      transport.departure_time,
      transport.arrival_time,
      transport.origin_timezone ?? undefined,
      transport.destination_timezone ?? undefined
    );
    return mins > 0 ? mins : null;
  })();

  const seatClass = transport.extra?.seat_class as string | undefined;
  const travelClass = transport.extra?.travel_class as string | undefined;
  const classLabel = transport.transport_type === 'flight' ? seatClass : travelClass;
  const showClass = ['flight', 'train', 'bus', 'ferry'].includes(transport.transport_type) && !!classLabel;

  if (!isDeparture) {
    // Arrival-only compact block
    return (
      <div className="flex items-center gap-3 py-3 px-4 bg-sky-50 border border-sky-200 rounded-xl text-sm">
        <Icon className="w-5 h-5" style={{ color }} />
        <div>
          <span className="font-semibold text-sky-800">← arrived from {transport.origin}</span>
          {transport.arrival_time && (
            <span className="ml-2 text-sky-600">{transport.arrival_time}</span>
          )}
          {transport.carrier && <span className="ml-2 text-sky-500">{transport.carrier}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}14`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              {transport.origin} → {transport.destination}
            </span>
            {transport.booked && transport.transport_type !== 'drive' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Booked
              </span>
            )}
            {transport.arrival_day_id && transport.arrival_day_id !== currentDayId && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                → arrives another day
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
            {transport.departure_time && <span>{transport.departure_time}</span>}
            {transport.arrival_time && transport.arrival_day_id === currentDayId && (
              <span>→ {transport.arrival_time}</span>
            )}
            {duration !== null && (
              <span className="text-slate-400">· {formatDuration(duration)}</span>
            )}
            {showClass && (
              <span className="capitalize text-sky-600 text-xs font-medium bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                {classLabel}
              </span>
            )}
            {transport.carrier && <span>{transport.carrier}</span>}
            {transport.reference && (
              <span className="font-mono text-slate-400">{transport.reference}</span>
            )}
            {transport.cost != null && (
              <span>
                {transport.cost} {transport.currency ?? ''}
              </span>
            )}
          </div>
          {transport.notes && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-1">{transport.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(transport)}
            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(transport.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options comparison view */}
      {transport.options && transport.options.length > 0 && (
        <div className="border-t border-slate-100 px-4 pb-4">
          <TransportOptionList transport={transport} onReload={onReload} />
        </div>
      )}
    </div>
  );
}
