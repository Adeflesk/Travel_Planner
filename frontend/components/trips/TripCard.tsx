'use client';

import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Calendar, DollarSign } from 'lucide-react';

interface TripCardProps {
  trip: Trip;
  onDelete: () => void;
}

const statusColors: Record<string, string> = {
  planning: 'bg-yellow-100 text-yellow-800',
  booked: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
};

export default function TripCard({ trip, onDelete }: TripCardProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        'Are you sure you want to delete this trip? ' +
        'This will delete all destinations, activities, expenses, ' +
        'and packing items.'
      )
    ) {
      try {
        await tripApi.delete(trip.id);
        onDelete();
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert('Failed to delete trip');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/trips/${trip.id}/edit`);
  };

  const handleClick = () => {
    router.push(`/trips/${trip.id}`);
  };

  const getStatusColor = (status: string) => {
    return statusColors[status] || statusColors.planning;
  };

  return (
    <div
      onClick={handleClick}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg
                 transition cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800">
            {trip.name}
          </h3>

          <div className="flex items-center gap-2 text-gray-600 mt-2">
            <Calendar className="w-4 h-4" />
            <p>
              {format(new Date(trip.start_date), 'MMM dd, yyyy')} -{' '}
              {format(new Date(trip.end_date), 'MMM dd, yyyy')}
            </p>
          </div>

          {trip.description && (
            <p className="text-gray-500 mt-2 text-sm">
              {trip.description}
            </p>
          )}
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 text-sm rounded-full
                       ${getStatusColor(trip.status)}`}
          >
            {trip.status}
          </span>

          {trip.budget && (
            <div className="flex items-center justify-end gap-1 mt-2">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <p className="text-gray-600 font-medium">
                {parseFloat(trip.budget.toString()).toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-blue-600 text-white text-sm
                       rounded hover:bg-blue-700 transition flex
                       items-center gap-1"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 text-white text-sm
                       rounded hover:bg-red-700 transition flex
                       items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
