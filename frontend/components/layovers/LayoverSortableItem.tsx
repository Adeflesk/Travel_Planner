'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FlightLayover } from '@/lib/types';
import { LayoverItem } from './LayoverItem';

interface LayoverSortableItemProps {
  layover: FlightLayover;
  onEdit: (layover: FlightLayover) => void;
  onDelete: (layoverId: number) => void;
}

export function LayoverSortableItem({
  layover,
  onEdit,
  onDelete,
}: LayoverSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layover.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-70' : undefined}
    >
      <LayoverItem
        layover={layover}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}
