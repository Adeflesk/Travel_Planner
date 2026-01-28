'use client';

import { Destination } from '@/lib/types';
import { format } from 'date-fns';
import { MapPin, Calendar } from 'lucide-react';

interface TimelineDestinationProps {
  destination: Destination;
}

export function TimelineDestination({ destination }: TimelineDestinationProps) {
  return (
    <div className="relative flex items-start gap-4 pb-8">
      {/* Timeline node */}
      <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full text-white shadow-lg">
        <MapPin className="w-6 h-6" />
      </div>

      {/* Content */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {destination.name}
              {destination.country && (
                <span className="text-gray-500 font-normal">, {destination.country}</span>
              )}
            </h3>
            {destination.region && (
              <p className="text-sm text-gray-500">{destination.region}</p>
            )}
          </div>
        </div>

        {(destination.arrival_date || destination.departure_date) && (
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            {destination.arrival_date && (
              <span>
                Arrive: {format(new Date(destination.arrival_date), 'MMM dd, yyyy')}
              </span>
            )}
            {destination.arrival_date && destination.departure_date && (
              <span className="text-gray-300">|</span>
            )}
            {destination.departure_date && (
              <span>
                Depart: {format(new Date(destination.departure_date), 'MMM dd, yyyy')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
