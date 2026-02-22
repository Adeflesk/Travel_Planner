'use client';

import { Expense } from '@/lib/types';
import { format } from 'date-fns';
import { Bed, Calendar, Check, AlertCircle } from 'lucide-react';

interface TimelineAccommodationProps {
  accommodation: Expense;
}

export function TimelineAccommodation({ accommodation }: TimelineAccommodationProps) {
  const checkInDate = accommodation.date ? new Date(accommodation.date) : null;

  return (
    <div className="relative flex items-start gap-4 pb-6">
      {/* Timeline node */}
      <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-violet-500 rounded-full text-white shadow-md flex-shrink-0 mt-1">
        <Bed className="w-4 h-4" />
      </div>

      {/* Card */}
      <div className="flex-1 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 leading-snug">
                {accommodation.description || 'Accommodation'}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {accommodation.booked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Check className="w-3 h-3" />
                    Booked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <AlertCircle className="w-3 h-3" />
                    Unconfirmed
                  </span>
                )}
                {accommodation.paid && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Paid
                  </span>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-violet-700 tabular-nums leading-none">
                {Number(accommodation.amount).toFixed(0)}
              </div>
              <div className="text-xs text-violet-400 mt-0.5 uppercase tracking-wide">
                {accommodation.currency}
              </div>
            </div>
          </div>

          {checkInDate && (
            <div className="mt-3 pt-3 border-t border-violet-100 flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span>
                Check-in:{' '}
                <span className="font-medium tabular-nums">
                  {format(checkInDate, 'MMM d, yyyy')}
                </span>
              </span>
            </div>
          )}

          {accommodation.cancel_by_date && (
            <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              Free cancellation until{' '}
              {format(new Date(accommodation.cancel_by_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
