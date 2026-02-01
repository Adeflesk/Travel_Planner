'use client';

import { Expense } from '@/lib/types';
import { format, differenceInDays } from 'date-fns';
import { Bed, Calendar, MapPin } from 'lucide-react';

interface TimelineAccommodationProps {
  accommodation: Expense;
}

export function TimelineAccommodation({ accommodation }: TimelineAccommodationProps) {
  const checkInDate = accommodation.date ? new Date(accommodation.date) : null;

  return (
    <div className="relative flex items-start gap-4 pb-8">
      {/* Timeline node */}
      <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full text-white shadow-lg">
        <Bed className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {accommodation.description || 'Accommodation'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  accommodation.booked
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {accommodation.booked ? 'Booked' : 'Not Booked'}
              </span>
              {accommodation.paid && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Paid
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-purple-600">
              {Number(accommodation.amount).toFixed(2)} {accommodation.currency}
            </span>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600 space-y-1">
          {checkInDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                Check-in: {format(checkInDate, 'MMM dd, yyyy')}
              </span>
            </div>
          )}
          {accommodation.cancel_by_date && (
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-xs">
                Free cancellation until {format(new Date(accommodation.cancel_by_date), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
