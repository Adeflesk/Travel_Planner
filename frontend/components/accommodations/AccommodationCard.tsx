'use client';

import { Accommodation } from '@/lib/types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Home, Edit2, Trash2, Phone, ExternalLink, AlertCircle } from 'lucide-react';

interface AccommodationCardProps {
  accommodation: Accommodation;
  onEdit: (acc: Accommodation) => void;
  onDelete: (id: number) => void;
}

export function AccommodationCard({ accommodation, onEdit, onDelete }: AccommodationCardProps) {
  const nights = differenceInCalendarDays(
    parseISO(accommodation.check_out_date),
    parseISO(accommodation.check_in_date)
  );

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Home className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{accommodation.name}</p>
            {accommodation.address && (
              <p className="text-xs text-gray-500 truncate">{accommodation.address}</p>
            )}
            <p className="text-xs text-gray-600 mt-0.5">
              {accommodation.check_in_date} → {accommodation.check_out_date}
              <span className="ml-1 text-gray-400">
                ({nights} night{nights !== 1 ? 's' : ''})
              </span>
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {accommodation.cost != null && (
                <span className="text-xs font-medium text-gray-700">
                  {accommodation.currency || 'USD'} {accommodation.cost.toFixed(2)}
                </span>
              )}
              {accommodation.booked && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  Booked
                </span>
              )}
              {accommodation.paid && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  Paid
                </span>
              )}
              {accommodation.cancel_by_date && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Cancel by {accommodation.cancel_by_date}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {accommodation.confirmation_number && (
                <span className="text-xs text-gray-500">
                  Ref: {accommodation.confirmation_number}
                </span>
              )}
              {accommodation.contact_phone && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {accommodation.contact_phone}
                </span>
              )}
              {accommodation.booking_url && (
                <a
                  href={accommodation.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View booking
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(accommodation)}
            className="p-1.5 text-blue-600 hover:text-blue-700"
            aria-label="Edit accommodation"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(accommodation.id)}
            className="p-1.5 text-red-600 hover:text-red-700"
            aria-label="Delete accommodation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
