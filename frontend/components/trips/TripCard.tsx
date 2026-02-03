'use client';

import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Calendar, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';

interface TripCardProps {
  trip: Trip;
  onDelete: () => void;
}

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

  return (
    <Card
      hover
      padding="md"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {trip.name}
            </h3>
            {trip.is_owner === false && (
              <Badge variant="info" size="sm" icon={<Users />}>
                Shared
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-600 mt-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            <p className="text-sm">
              {format(new Date(trip.start_date), 'MMM dd, yyyy')} -{' '}
              {format(new Date(trip.end_date), 'MMM dd, yyyy')}
            </p>
          </div>

          {trip.shared_by && (
            <p className="text-primary-600 mt-1 text-sm">
              Shared by {trip.shared_by}
            </p>
          )}

          {trip.description && (
            <p className="text-slate-500 mt-2 text-sm line-clamp-2">
              {trip.description}
            </p>
          )}
        </div>

        <div className="text-right flex flex-col items-end">
          <StatusBadge status={trip.status as 'planning' | 'booked' | 'ongoing' | 'completed'} />

          {trip.budget && (
            <div className="flex items-center gap-1 mt-2 text-slate-600">
              <DollarSign className="w-4 h-4 text-success-500" />
              <p className="font-medium">
                {parseFloat(trip.budget.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {trip.is_owner !== false && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleEdit}
                leftIcon={<Edit />}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                leftIcon={<Trash2 />}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
