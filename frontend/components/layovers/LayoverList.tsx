'use client';

import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { FlightLayover, FlightLayoverFormData } from '@/lib/types';
import { Plus, Plane } from 'lucide-react';
import { LayoverSortableItem } from './LayoverSortableItem';
import { LayoverForm } from './LayoverForm';
import { useLayovers } from './useLayovers';

interface LayoverListProps {
  journeyId: number;
}

export function LayoverList({ journeyId }: LayoverListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLayover, setEditingLayover] =
    useState<FlightLayover | null>(null);

  const {
    layovers,
    loading,
    error,
    addLayover,
    updateLayover,
    deleteLayover,
    reorderLayovers,
  } = useLayovers(journeyId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = layovers.findIndex((layover) => layover.id === active.id);
    const newIndex = layovers.findIndex((layover) => layover.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(layovers, oldIndex, newIndex);
    reorderLayovers(reordered.map((layover) => layover.id));
  };
  const handleAdd = async (data: FlightLayoverFormData) => {
    await addLayover({
      ...data,
      order: layovers.length,
    });
    setShowAddForm(false);
  };

  const handleUpdate = async (data: FlightLayoverFormData) => {
    if (editingLayover) {
      await updateLayover(editingLayover.id, data);
      setEditingLayover(null);
    }
  };

  const handleDelete = async (layoverId: number) => {
    if (confirm('Delete this layover?')) {
      await deleteLayover(layoverId);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading layovers...</div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-sky-600" />
          <h3 className="font-semibold text-gray-800">Flight Layovers</h3>
        </div>
        {!showAddForm && !editingLayover && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Layover
          </button>
        )}
      </div>

      {layovers.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500">
          <Plane className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No layovers for this flight yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-sky-600 hover:underline"
          >
            Add your first layover
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={layovers.map((layover) => layover.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {layovers.map((layover) =>
              editingLayover?.id === layover.id ? (
                <LayoverForm
                  key={layover.id}
                  journeyId={journeyId}
                  layover={layover}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingLayover(null)}
                />
              ) : (
                <LayoverSortableItem
                  key={layover.id}
                  layover={layover}
                  onEdit={setEditingLayover}
                  onDelete={handleDelete}
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      {showAddForm && (
        <LayoverForm
          journeyId={journeyId}
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
