'use client';

import { useState } from 'react';
import { JourneyStop } from '@/lib/types';
import { Plus, Route } from 'lucide-react';
import { JourneyStopItem } from './JourneyStopItem';
import { JourneyStopForm } from './JourneyStopForm';
import { useJourneyStops } from './useJourneyStops';

interface JourneyStopsListProps {
  journeyId: number;
  journeyName?: string;
}

export function JourneyStopsList({ journeyId, journeyName }: JourneyStopsListProps) {
  const [showAddStop, setShowAddStop] = useState(false);
  const [editingStop, setEditingStop] = useState<JourneyStop | null>(null);

  const { stops, loading, error, addStop, updateStop, deleteStop } =
    useJourneyStops(journeyId);

  const handleAddStop = async (data: Partial<JourneyStop>) => {
    await addStop({
      ...data,
      order: stops.length,
    } as Omit<JourneyStop, 'id'>);
    setShowAddStop(false);
  };

  const handleUpdateStop = async (data: Partial<JourneyStop>) => {
    if (editingStop) {
      await updateStop(editingStop.id, data);
      setEditingStop(null);
    }
  };

  const handleDeleteStop = async (stopId: number) => {
    if (confirm('Delete this stop? All options will also be deleted.')) {
      await deleteStop(stopId);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading stops...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-gray-800">
            Stops Along the Way
            {journeyName && <span className="text-gray-500 font-normal"> - {journeyName}</span>}
          </h3>
        </div>
        {!showAddStop && !editingStop && (
          <button
            onClick={() => setShowAddStop(true)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Stop
          </button>
        )}
      </div>

      {/* Empty state */}
      {stops.length === 0 && !showAddStop && (
        <div className="text-center py-8 text-gray-500">
          <Route className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No stops planned for this journey yet.</p>
          <button
            onClick={() => setShowAddStop(true)}
            className="mt-2 text-blue-600 hover:underline"
          >
            Add your first stop
          </button>
        </div>
      )}

      {/* Stops List */}
      <div className="space-y-3">
        {stops.map((stop) =>
          editingStop?.id === stop.id ? (
            <JourneyStopForm
              key={stop.id}
              journeyId={journeyId}
              stop={stop}
              onSubmit={handleUpdateStop}
              onCancel={() => setEditingStop(null)}
            />
          ) : (
            <JourneyStopItem
              key={stop.id}
              stop={stop}
              onEdit={setEditingStop}
              onDelete={handleDeleteStop}
            />
          )
        )}
      </div>

      {/* Add Stop Form */}
      {showAddStop && (
        <JourneyStopForm
          journeyId={journeyId}
          onSubmit={handleAddStop}
          onCancel={() => setShowAddStop(false)}
        />
      )}
    </div>
  );
}
