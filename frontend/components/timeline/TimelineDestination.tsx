'use client';

import { Destination } from '@/lib/types';
import { format } from 'date-fns';
import { MapPin, ArrowRight } from 'lucide-react';

interface TimelineDestinationProps {
  destination: Destination;
}

export function TimelineDestination({ destination }: TimelineDestinationProps) {
  return (
    <div className="relative flex items-start gap-4 pb-6">
      {/* Timeline node — primary anchor */}
      <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-primary-600 rounded-full text-white shadow-md ring-4 ring-primary-100 flex-shrink-0">
        <MapPin className="w-5 h-5" />
      </div>

      {/* Card */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary-700 via-primary-500 to-primary-300" />

        <div className="p-4">
          <h3
            className="text-2xl font-semibold leading-snug text-slate-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {destination.name}
            {destination.country && (
              <span
                className="text-slate-400 font-normal ml-2 text-lg"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {destination.country}
              </span>
            )}
          </h3>
          {destination.region && (
            <p className="mt-0.5 text-sm text-slate-500 tracking-wide">{destination.region}</p>
          )}

          {(destination.arrival_date || destination.departure_date) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap text-sm text-slate-600">
              {destination.arrival_date && (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Arrive
                  </span>
                  <span className="font-medium tabular-nums">
                    {format(new Date(destination.arrival_date), 'MMM d, yyyy')}
                  </span>
                </span>
              )}
              {destination.arrival_date && destination.departure_date && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              )}
              {destination.departure_date && (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Depart
                  </span>
                  <span className="font-medium tabular-nums">
                    {format(new Date(destination.departure_date), 'MMM d, yyyy')}
                  </span>
                </span>
              )}
            </div>
          )}

          {destination.notes && (
            <p className="mt-2 text-sm text-slate-500 italic">{destination.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
