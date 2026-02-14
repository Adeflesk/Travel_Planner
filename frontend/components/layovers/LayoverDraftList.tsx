'use client';

import { useRef, useState } from 'react';
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
import { Plus, Plane } from 'lucide-react';
import { FlightLayoverFormData } from '@/lib/types';
import { LayoverForm } from './LayoverForm';
import { LayoverSortableItem } from './LayoverSortableItem';
import { DraftLayover } from './types';

interface LayoverDraftListProps {
  layovers: DraftLayover[];
  onChange: (nextLayovers: DraftLayover[]) => void;
}

export function LayoverDraftList({ layovers, onChange }: LayoverDraftListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLayover, setEditingLayover] = useState<DraftLayover | null>(null);
  const nextIdRef = useRef(1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const normalizeOrder = (items: DraftLayover[]) =>
    items.map((item, index) => ({ ...item, order: index }));

  const handleAdd = async (data: FlightLayoverFormData) => {
    const nextLayover: DraftLayover = {
      ...data,
      id: nextIdRef.current,
      order: layovers.length,
    };
    nextIdRef.current += 1;
    onChange([...layovers, nextLayover]);
    setShowAddForm(false);
  };

  const handleUpdate = async (data: FlightLayoverFormData) => {
    if (!editingLayover) return;
    const next = layovers.map((item) =>
      item.id === editingLayover.id
        ? { ...item, ...data, id: editingLayover.id, order: editingLayover.order }
        : item
    );
    onChange(next);
    setEditingLayover(null);
  };

  const handleDelete = async (layoverId: number) => {
    if (!confirm('Delete this layover?')) return;
    const remaining = layovers.filter((item) => item.id !== layoverId);
    onChange(normalizeOrder(remaining));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = layovers.findIndex((layover) => layover.id === active.id);
    const newIndex = layovers.findIndex((layover) => layover.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(layovers, oldIndex, newIndex);
    onChange(normalizeOrder(reordered));
  };

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
                  journeyId={0}
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
          journeyId={0}
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
