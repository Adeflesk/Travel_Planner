'use client';

import Link from 'next/link';
import { useTimeline } from './useTimeline';
import { useTripAccommodations } from '@/components/accommodations/useTripAccommodations';
import { AccommodationDayBadge } from '@/components/accommodations/AccommodationDayBadge';
import { TripDay, TripTransport, TransportType } from '@/lib/types';
import { format } from 'date-fns';
import { parseSafeDate } from '@/lib/datetime-utils';
import { Calendar, ArrowRight } from 'lucide-react';

const TRANSPORT_ICON: Record<TransportType, string> = {
  flight: '✈',
  train: '🚆',
  bus: '🚌',
  drive: '🚗',
  ferry: '⛴',
  other: '🚀',
};

interface DayTransportRowProps {
  transport: TripTransport;
  currentDayId: number;
}

function DayTransportRow({ transport, currentDayId }: DayTransportRowProps) {
  const icon = TRANSPORT_ICON[transport.transport_type] ?? '🚀';
  const isDeparture = transport.departure_day_id === currentDayId;

  if (!isDeparture) {
    return (
      <div className="flex items-center gap-3 py-2 pl-2 text-sm text-teal-700">
        <span>{icon}</span>
        <span>← arrived from {transport.origin}</span>
        {transport.arrival_time && <span className="text-teal-500">{transport.arrival_time}</span>}
        {transport.carrier && <span className="text-teal-400">{transport.carrier}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2 pl-2 text-sm">
      <span className="mt-0.5">{icon}</span>
      <div>
        <span className="font-medium text-sky-800">
          {transport.origin} → {transport.destination}
        </span>
        <div className="flex items-center gap-2 text-xs text-sky-500 mt-0.5 flex-wrap">
          {transport.departure_time && <span>{transport.departure_time}</span>}
          {transport.arrival_time && transport.arrival_day_id === currentDayId && (
            <span>→ {transport.arrival_time}</span>
          )}
          {transport.arrival_day_id !== currentDayId && transport.arrival_day_id != null && (
            <span className="text-slate-400">→ arrives another day</span>
          )}
          {transport.carrier && <span>{transport.carrier}</span>}
          {transport.reference && <span className="font-mono">{transport.reference}</span>}
          {transport.booked && (
            <span className="text-emerald-600 font-semibold">Booked ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface DaySectionProps {
  day: TripDay;
  transportItems: TripTransport[];
  tripId: number;
  accommodationBadge?: { type: 'check-in' | 'staying' | 'check-out'; name: string } | null;
}

function DaySection({ day, transportItems, tripId, accommodationBadge }: DaySectionProps) {
  const activities = day.activities ?? [];
  const hasContent = activities.length > 0 || transportItems.length > 0;

  type TimelineRow =
    | { kind: 'activity'; time: string; title: string; category?: string }
    | { kind: 'transport'; transport: TripTransport };

  const rows: TimelineRow[] = [];

  activities.forEach(a => {
    rows.push({ kind: 'activity', time: a.start_time ?? '', title: a.title, category: a.category });
  });

  transportItems.forEach(t => {
    rows.push({ kind: 'transport', transport: t });
  });

  rows.sort((a, b) => {
    const timeA = a.kind === 'activity' ? a.time : (
      a.transport.departure_day_id === day.id ? a.transport.departure_time ?? '' : a.transport.arrival_time ?? ''
    );
    const timeB = b.kind === 'activity' ? b.time : (
      b.transport.departure_day_id === day.id ? b.transport.departure_time ?? '' : b.transport.arrival_time ?? ''
    );
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="relative pl-10">
      <div className="absolute left-0 top-2 w-5 h-5 rounded-full bg-sky-100 border-2 border-sky-400 flex items-center justify-center">
        <Calendar className="w-2.5 h-2.5 text-sky-600" />
      </div>

      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-bold text-slate-800">
            {format(parseSafeDate(day.date), 'EEE d MMM')}
          </span>
          {(day.title || day.location) && (
            <span className="ml-2 text-sm text-slate-500">· {day.title || day.location}</span>
          )}
        </div>
        <Link
          href={`/trips/${tripId}/days/${day.id}`}
          className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1 transition-colors"
        >
          Open day <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {accommodationBadge && (
        <div className="mb-2 pl-2">
          <AccommodationDayBadge type={accommodationBadge.type} name={accommodationBadge.name} />
        </div>
      )}

      {!hasContent && (
        <p className="text-sm text-slate-400 italic pl-2 mb-3">Nothing planned · Open day to add items</p>
      )}

      {rows.map((row, i) => (
        <div key={i}>
          {row.kind === 'activity' ? (
            <div className="flex items-center gap-3 py-1.5 text-sm text-slate-700">
              <span className="w-12 text-right text-xs text-slate-400 flex-shrink-0">{row.time}</span>
              <span>{row.title}</span>
              {row.category && <span className="text-xs text-slate-400 capitalize">{row.category}</span>}
            </div>
          ) : (
            <DayTransportRow transport={row.transport} currentDayId={day.id} />
          )}
        </div>
      ))}
    </div>
  );
}

interface TripTimelineProps {
  tripId: number;
}

export default function TripTimeline({ tripId }: TripTimelineProps) {
  const { days, loading, getTransportForDay, getUnscheduledTransport } = useTimeline(tripId);
  const { getBadgeType } = useTripAccommodations(tripId);

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 animate-pulse">
            <div className="w-5 h-5 rounded-full bg-slate-200 flex-shrink-0 mt-1" />
            <div className="flex-1 h-16 rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
          <Calendar className="w-7 h-7 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-600">No itinerary yet</p>
        <p className="text-sm text-slate-400 mt-1">
          Add days to your trip to see the timeline.
        </p>
      </div>
    );
  }

  const unscheduled = getUnscheduledTransport();

  return (
    <div className="relative">
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none"
        style={{
          left: '10px',
          background: 'linear-gradient(to bottom, #BFDBFE 0%, #CBD5E1 70%, transparent 100%)',
        }}
      />

      <div className="space-y-6">
        {days.map((day, index) => (
          <div
            key={day.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
          >
            <DaySection
              day={day}
              transportItems={getTransportForDay(day.id)}
              tripId={tripId}
              accommodationBadge={(() => {
                const b = getBadgeType(day.date);
                return b ? { type: b.type, name: b.accommodation.name } : null;
              })()}
            />
          </div>
        ))}

        {unscheduled.length > 0 && (
          <div className="mt-8 border-t border-dashed border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 pl-10">
              Unscheduled Transport
            </h3>
            <div className="space-y-2 pl-10">
              {unscheduled.map(t => (
                <div key={t.id} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                  <span>{TRANSPORT_ICON[t.transport_type] ?? '🚀'}</span>
                  <span>{t.origin} → {t.destination}</span>
                  {t.carrier && <span className="text-slate-400">{t.carrier}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
