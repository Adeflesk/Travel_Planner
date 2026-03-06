'use client';

import { useState, useEffect } from 'react';
import { Accommodation, AccommodationCreate, AccommodationUpdate } from '@/lib/types';
import { useAccommodations } from './useAccommodations';
import { AccommodationCard } from './AccommodationCard';
import { AccommodationForm } from './AccommodationForm';
import { Plus } from 'lucide-react';

interface AccommodationListProps {
  tripId: number;
  destinationId: number;
}

export function AccommodationList({ tripId, destinationId }: AccommodationListProps) {
  const { accommodations, loading, load, create, update, remove } = useAccommodations(
    tripId,
    destinationId
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Accommodation | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (data: AccommodationCreate | AccommodationUpdate) => {
    if (editing) {
      await update(editing.id, data as AccommodationUpdate);
    } else {
      await create(data as AccommodationCreate);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (acc: Accommodation) => {
    setEditing(acc);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this accommodation?')) {
      await remove(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="mt-2">
      {loading ? (
        <p className="text-xs text-gray-400 ml-7">Loading...</p>
      ) : (
        <div className="space-y-2">
          {accommodations.map((acc) => (
            <AccommodationCard
              key={acc.id}
              accommodation={acc}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      <button
        onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}
        className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Accommodation
      </button>
      {showForm && (
        <AccommodationForm
          tripId={tripId}
          destinationId={destinationId}
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
