'use client';

import { useState } from 'react';
import { Journey } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit2, ArrowRight, Plane, Train, Bus, Car, Ship, Footprints, Copy, Route, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { getStatusColor } from './useJourneys';
import { JourneyStopsList } from '../journey-stops';
import { JourneyDocuments } from './JourneyDocuments';

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
  const [showStops, setShowStops] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const TransportIcon = transportIcons[journey.transport_mode] || Plane;

  // Only show stops for ground transport (car, bus, train)
  const canHaveStops = ['car', 'bus', 'train'].includes(journey.transport_mode);

  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-md transition">
      {/* Journey Header */}
      <div className="p-4">
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
                  <span className="font-medium">Cost:</span>{' '}
                  {(+journey.cost).toFixed(2)} {journey.currency || 'USD'}
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

        {/* Toggle Buttons */}
        <div className="mt-3 ml-12 flex gap-4">
          {/* Stops Toggle - only for ground transport */}
          {canHaveStops && (
            <button
              onClick={() => setShowStops(!showStops)}
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
            >
              <Route className="w-4 h-4" />
              {showStops ? (
                <>
                  <span>Hide Stops</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Manage Stops</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Documents Toggle */}
          <button
            onClick={() => setShowDocuments(!showDocuments)}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
          >
            <FileText className="w-4 h-4" />
            {showDocuments ? (
              <>
                <span>Hide Documents</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Documents</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stops Section */}
      {canHaveStops && showStops && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <JourneyStopsList journeyId={journey.id} />
        </div>
      )}

      {/* Documents Section */}
      {showDocuments && (
        <div className="border-t border-gray-200 p-4 bg-purple-50">
          <JourneyDocuments journeyId={journey.id} />
        </div>
      )}
    </div>
  );
}
