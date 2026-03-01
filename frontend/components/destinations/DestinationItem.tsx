'use client';

import { Destination, Expense } from '@/lib/types';
import { format } from 'date-fns';
import { MapPin, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { AccommodationInfo } from './AccommodationInfo';
import { DestinationActivityList } from './DestinationActivityList';
import { WeatherBadge, useWeather } from '../weather';

interface DestinationItemProps {
  destination: Destination;
  accommodationExpenses: Expense[];
  isExpanded: boolean;
  onEdit: (destination: Destination) => void;
  onDelete: (id: number) => void;
  onToggleExpanded: (id: number) => void;
}

export function DestinationItem({
  destination,
  accommodationExpenses,
  isExpanded,
  onEdit,
  onDelete,
  onToggleExpanded,
}: DestinationItemProps) {
  const { weather, loading, temperatureUnit, toggleTemperatureUnit } = useWeather(destination.id);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-lg">
              {destination.name}
              {destination.region && `, ${destination.region}`}
              {destination.country && `, ${destination.country}`}
            </h4>
          </div>
          {destination.arrival_date && destination.departure_date && (
            <p className="text-sm text-gray-600 mt-1 ml-7">
              {format(new Date(destination.arrival_date), 'MMM dd')} -{' '}
              {format(new Date(destination.departure_date), 'MMM dd')}
            </p>
          )}
          <AccommodationInfo expenses={accommodationExpenses} />
          {!loading && weather && (
            <WeatherBadge
              forecast={weather}
              temperatureUnit={temperatureUnit}
              onToggleUnit={toggleTemperatureUnit}
            />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(destination)}
            className="text-blue-600 hover:text-blue-700 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
            aria-label="Edit destination"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(destination.id)}
            className="text-red-600 hover:text-red-700 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
            aria-label="Delete destination"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expand/Collapse Activities Button */}
      <button
        onClick={() => onToggleExpanded(destination.id)}
        className="mt-3 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {isExpanded ? 'Hide Activities' : 'Show Activities'}
      </button>

      {/* Expandable Activities Section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <DestinationActivityList destinationId={destination.id} />
        </div>
      )}
    </div>
  );
}
