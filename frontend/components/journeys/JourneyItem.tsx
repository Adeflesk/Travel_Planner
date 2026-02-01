'use client';

import { useState } from 'react';
import { Journey, RouteType } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit2, ArrowRight, Plane, Train, Bus, Car, Ship, Footprints, Copy, Route, ChevronDown, ChevronUp, FileText, MapPin, Clock, DollarSign } from 'lucide-react';
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

const routeTypeLabels: Record<RouteType, string> = {
  fastest: 'Fastest',
  shortest: 'Shortest',
  scenic: 'Scenic',
  avoid_highways: 'No Highways',
  avoid_tolls: 'No Tolls',
};

// Format duration in minutes to human-readable format
const formatDuration = (minutes?: number): string | null => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// Check if journey has any route details
const hasRouteDetails = (journey: Journey): boolean => {
  return !!(
    journey.distance_km ||
    journey.distance_miles ||
    journey.estimated_duration_minutes ||
    journey.route_type ||
    journey.has_tolls ||
    journey.toll_cost ||
    journey.route_notes
  );
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

            {/* Route Details */}
            {hasRouteDetails(journey) && (
              <div className="mt-3 ml-12 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Route Details</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {(journey.distance_miles || journey.distance_km) && (
                    <div>
                      <span className="text-gray-500">Distance:</span>{' '}
                      <span className="font-medium">
                        {journey.distance_miles && `${journey.distance_miles} mi`}
                        {journey.distance_miles && journey.distance_km && ' / '}
                        {journey.distance_km && `${journey.distance_km} km`}
                      </span>
                    </div>
                  )}
                  {journey.estimated_duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">Drive:</span>{' '}
                      <span className="font-medium">{formatDuration(journey.estimated_duration_minutes)}</span>
                    </div>
                  )}
                  {journey.route_type && (
                    <div>
                      <span className="text-gray-500">Route:</span>{' '}
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {routeTypeLabels[journey.route_type]}
                      </span>
                    </div>
                  )}
                  {journey.has_tolls && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">Tolls:</span>{' '}
                      <span className="font-medium">
                        {journey.toll_cost
                          ? `${journey.toll_cost.toFixed(2)} ${journey.currency || 'USD'}`
                          : 'Yes'}
                      </span>
                    </div>
                  )}
                </div>
                {journey.route_notes && (
                  <p className="mt-2 text-sm text-gray-600 italic">
                    {journey.route_notes}
                  </p>
                )}
              </div>
            )}
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
