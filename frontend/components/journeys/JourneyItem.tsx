'use client';

import { Journey } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit2, ArrowRight, Plane, Train, Bus, Car, Ship, Footprints, Copy } from 'lucide-react';
import { getStatusColor } from './useJourneys';

const transportIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  car: Car,
  ferry: Ship,
  walk: Footprints,
};

interface JourneyItemProps {
  journey: Journey;
  getDestinationName: (destId?: number) => string;
  onEdit: (journey: Journey) => void;
  onDelete: (id: number) => void;
  onDuplicateReturn: (journey: Journey) => void;
}

export function JourneyItem({
  journey,
  getDestinationName,
  onEdit,
  onDelete,
  onDuplicateReturn,
}: JourneyItemProps) {
  const TransportIcon = transportIcons[journey.transport_mode] || Plane;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <TransportIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {journey.origin_name || getDestinationName(journey.origin_id)}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="font-semibold">
                {journey.destination_name || getDestinationName(journey.destination_id)}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                journey.status
              )}`}
            >
              {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
            </span>
          </div>
          <div className="mt-2 ml-12 text-sm text-gray-600 space-y-1">
            {journey.carrier && (
              <p>
                <span className="font-medium">Carrier:</span> {journey.carrier}
              </p>
            )}
            {journey.departure_datetime && (
              <p>
                <span className="font-medium">Departs:</span>{' '}
                {format(new Date(journey.departure_datetime), 'MMM dd, yyyy HH:mm')}
              </p>
            )}
            {journey.arrival_datetime && (
              <p>
                <span className="font-medium">Arrives:</span>{' '}
                {format(new Date(journey.arrival_datetime), 'MMM dd, yyyy HH:mm')}
              </p>
            )}
            {journey.booking_reference && (
              <p>
                <span className="font-medium">Ref:</span> {journey.booking_reference}
              </p>
            )}
            {journey.cost && (
              <p>
                <span className="font-medium">Cost:</span> ${(+journey.cost).toFixed(2)}{' '}
                {journey.currency}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(journey)}
            className="text-blue-600 hover:text-blue-700 p-2"
            title="Edit journey"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicateReturn(journey)}
            className="text-green-600 hover:text-green-700 p-2"
            title="Duplicate as return trip"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(journey.id)}
            className="text-red-600 hover:text-red-700 p-2"
            title="Delete journey"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
