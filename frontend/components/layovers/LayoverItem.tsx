'use client';

import { FlightLayover } from '@/lib/types';
import type { ButtonHTMLAttributes } from 'react';
import { format } from 'date-fns';
import { Plane, Clock, Trash2, Edit2, MapPin, GripVertical } from 'lucide-react';
import {
  getLayoverDurationMinutes,
  formatLayoverDuration,
  getDurationColorClass,
} from './useLayovers';

interface LayoverItemProps {
  layover: FlightLayover;
  onEdit: (layover: FlightLayover) => void;
  onDelete: (layoverId: number) => void;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

export function LayoverItem({
  layover,
  onEdit,
  onDelete,
  dragHandleProps,
}: LayoverItemProps) {
  const durationMinutes = getLayoverDurationMinutes(
    layover.arrival_datetime,
    layover.departure_datetime
  );
  const durationText = formatLayoverDuration(durationMinutes);
  const durationColor = getDurationColorClass(durationMinutes);

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-4">
      <div className="flex items-start gap-3">
        {dragHandleProps && (
          <button
            type="button"
            className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab"
            aria-label="Reorder layover"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <div className="p-2 bg-sky-100 rounded-full text-sky-600 shrink-0">
          <Plane className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-800">
                {layover.airport_name}
              </h4>
              {layover.airport_code && (
                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-bold tracking-wider">
                  {layover.airport_code}
                </span>
              )}
              {durationText && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${durationColor}`}
                >
                  {durationText} layover
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(layover)}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Edit layover"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(layover.id)}
                className="text-red-600 hover:text-red-700 p-1"
                title="Delete layover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {(layover.terminal || layover.gate) && (
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {layover.terminal && <span>{layover.terminal}</span>}
              {layover.terminal && layover.gate && (
                <span className="text-gray-300">|</span>
              )}
              {layover.gate && <span>Gate {layover.gate}</span>}
            </div>
          )}

          {(layover.arrival_datetime || layover.departure_datetime) && (
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {layover.arrival_datetime && (
                <span>
                  Arrive:{' '}
                  {format(new Date(layover.arrival_datetime), 'MMM dd, HH:mm')}
                </span>
              )}
              {layover.departure_datetime && (
                <span>
                  Depart:{' '}
                  {format(new Date(layover.departure_datetime), 'MMM dd, HH:mm')}
                </span>
              )}
            </div>
          )}

          {(layover.connecting_flight_number || layover.connecting_airline) && (
            <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-600">
              <Plane className="w-3.5 h-3.5 text-gray-400" />
              <span>
                Next:{' '}
                {[layover.connecting_airline, layover.connecting_flight_number]
                  .filter(Boolean)
                  .join(' ')}
              </span>
            </div>
          )}

          {layover.notes && (
            <p className="text-sm text-gray-500 mt-1.5 italic">
              {layover.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
