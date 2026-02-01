'use client';

import { Journey } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowDown, AlertTriangle, AlertCircle } from 'lucide-react';
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

  const getBorderClass = () => {
    if (conflict?.type === 'overlap') return 'border-red-400 border-2';
    if (conflict?.type === 'gap') return 'border-amber-400 border-2';
    return 'border-gray-200';
  };

  return (
    <div className="relative flex items-start gap-4 pb-8">
      {/* Conflict warning banner */}
      {conflict && (
        <div
          className={`absolute -top-6 left-16 right-0 flex items-center gap-2 px-3 py-1 rounded-t-lg text-xs font-medium ${
            conflict.type === 'overlap'
              ? 'bg-red-100 text-red-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {conflict.type === 'overlap' ? (
            <AlertCircle className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
          {conflict.message}
        </div>
      )}

      {/* Timeline node */}
      <div className={`relative z-10 flex items-center justify-center w-12 h-12 ${
        conflict?.type === 'overlap' ? 'bg-red-500' : getStatusColor(journey.status)
      } rounded-full text-white shadow-lg`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className={`flex-1 bg-gradient-to-r from-gray-50 to-white border ${getBorderClass()} rounded-lg p-4 shadow-sm ${conflict ? 'mt-4' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-gray-700">
            {journey.origin_name || getDestinationName(journey.origin_id)}
          </span>
          <ArrowDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
          <span className="font-medium text-gray-700">
            {journey.destination_name || getDestinationName(journey.destination_id)}
          </span>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
            journey.status === 'booked'
              ? 'bg-green-100 text-green-800'
              : journey.status === 'completed'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
          </span>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          {journey.carrier && (
            <p><span className="font-medium">Carrier:</span> {journey.carrier}</p>
          )}
          <div className="flex flex-wrap gap-4">
            {journey.departure_datetime && (
              <span>
                <span className="font-medium">Departs:</span>{' '}
                {format(new Date(journey.departure_datetime), 'MMM dd, HH:mm')}
              </span>
            )}
            {journey.arrival_datetime && (
              <span>
                <span className="font-medium">Arrives:</span>{' '}
                {format(new Date(journey.arrival_datetime), 'MMM dd, HH:mm')}
              </span>
            )}
          </div>
          {journey.booking_reference && (
            <p><span className="font-medium">Ref:</span> {journey.booking_reference}</p>
          )}
          {journey.cost && (
            <p><span className="font-medium">Cost:</span> {Number(journey.cost).toFixed(2)} {journey.currency || 'USD'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
