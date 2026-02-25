'use client';

import { Journey } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react';
import { transportIcons, ConflictInfo } from './useTimeline';

interface TimelineJourneyProps {
  journey: Journey;
  getDestinationName: (destId?: number) => string;
  getStatusColor: (status: string) => string;
  conflict?: ConflictInfo;
}

export function TimelineJourney({
  journey,
  getDestinationName,
  getStatusColor,
  conflict,
}: TimelineJourneyProps) {
  const Icon = transportIcons[journey.transport_mode] || transportIcons.flight;

  const nodeColor = conflict?.type === 'overlap'
    ? 'bg-red-500'
    : getStatusColor(journey.status);

  const leftBorderClass = conflict?.type === 'overlap'
    ? 'border-l-4 border-l-red-400'
    : conflict?.type === 'gap'
    ? 'border-l-4 border-l-amber-400'
    : '';

  const statusBadgeClass = journey.status === 'booked'
    ? 'bg-green-100 text-green-700'
    : journey.status === 'completed'
    ? 'bg-slate-100 text-slate-600'
    : 'bg-blue-100 text-blue-700';

  return (
    <div className="relative flex items-start gap-4 pb-6">
      {/* Timeline node */}
      <div
        className={`relative z-10 flex items-center justify-center w-10 h-10 ${nodeColor} rounded-full text-white shadow-md flex-shrink-0 mt-1`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Boarding pass card */}
      <div
        className={`flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${leftBorderClass}`}
      >
        {/* Route header */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              {journey.origin_name || getDestinationName(journey.origin_id)}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="font-semibold text-slate-900">
              {journey.destination_name || getDestinationName(journey.destination_id)}
            </span>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}`}>
              {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
            </span>
          </div>
          {journey.carrier && (
            <p className="mt-0.5 text-sm text-slate-500">{journey.carrier}</p>
          )}
        </div>

        {/* Dashed divider — ticket stub */}
        <div className="mx-4 border-t border-dashed border-slate-200" />

        {/* Times row */}
        {(journey.departure_datetime || journey.arrival_datetime) && (
          <div className="px-4 py-3 flex items-center gap-2">
            {journey.departure_datetime && (
              <div className="text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                  Departs
                </div>
                <div className="text-xl font-bold text-slate-800 tabular-nums leading-none">
                  {format(new Date(journey.departure_datetime), 'HH:mm')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {format(new Date(journey.departure_datetime), 'MMM d')}
                </div>
              </div>
            )}

            {journey.departure_datetime && journey.arrival_datetime && (
              <div className="flex-1 flex items-center px-2">
                <div className="flex-1 border-t border-dashed border-slate-200" />
                <Icon className="w-3.5 h-3.5 text-slate-300 mx-2 flex-shrink-0" />
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>
            )}

            {journey.arrival_datetime && (
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                  Arrives
                </div>
                <div className="text-xl font-bold text-slate-800 tabular-nums leading-none">
                  {format(new Date(journey.arrival_datetime), 'HH:mm')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {format(new Date(journey.arrival_datetime), 'MMM d')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer: booking ref + cost */}
        {(journey.booking_reference || journey.cost) && (
          <>
            <div className="mx-4 border-t border-slate-100" />
            <div className="px-4 py-2 flex items-center justify-between bg-slate-50 text-xs text-slate-500">
              {journey.booking_reference ? (
                <span className="font-mono tracking-wide">Ref: {journey.booking_reference}</span>
              ) : (
                <span />
              )}
              {journey.cost && (
                <span className="font-semibold text-slate-700 ml-auto">
                  {Number(journey.cost).toFixed(2)} {journey.currency || 'USD'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Conflict alert */}
        {conflict && (
          <div
            className={`px-4 py-2 flex items-center gap-2 text-xs font-medium ${
              conflict.type === 'overlap'
                ? 'bg-red-50 text-red-700 border-t border-red-100'
                : 'bg-amber-50 text-amber-700 border-t border-amber-100'
            }`}
          >
            {conflict.type === 'overlap' ? (
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {conflict.message}
          </div>
        )}
      </div>
    </div>
  );
}
