import React, { useState } from 'react';
import { TransportStop, TransportStopCreate, TransportStopUpdate } from '@/lib/types';
import { TransportStopItem } from './TransportStopItem';
import { TransportStopForm } from './TransportStopForm';
import { Button } from '@/components/ui/Button';
import { Plus, HelpCircle } from 'lucide-react';

interface TransportStopListProps {
  stops: TransportStop[];
  onCreate: (data: TransportStopCreate) => Promise<unknown>;
  onUpdate: (id: number, data: TransportStopUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  onReorder: (newOrder: { id: number; sort_order: number }[]) => Promise<unknown>;
}

export const TransportStopList = ({ stops, onCreate, onUpdate, onDelete, onReorder }: TransportStopListProps) => {
  const [isAdding, setIsAdding] = useState(false);

  // HTML5 Drag and Drop handlers for light reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const list = [...stops];
    const draggedItem = list[draggedIdx];
    list.splice(draggedIdx, 1);
    list.splice(index, 0, draggedItem);

    const reorderedStops = list.map((item, idx) => ({
      id: item.id,
      sort_order: idx,
    }));

    await onReorder(reorderedStops);
    setDraggedIdx(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h4 className="font-semibold text-slate-800 text-sm">Stops & Sightseeing Checklist</h4>
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
        </div>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Stop
          </Button>
        )}
      </div>

      {isAdding && (
        <TransportStopForm onSave={onCreate} onCancel={() => setIsAdding(false)} />
      )}

      {stops.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm bg-slate-50/20">
          No stops added to this drive leg yet.
        </div>
      ) : (
        <div className="space-y-2">
          {stops.map((stop, idx) => (
            <div
              key={stop.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`${draggedIdx === idx ? 'opacity-40' : ''}`}
            >
              <TransportStopItem
                stop={stop}
                onUpdate={onUpdate}
                onDelete={onDelete}
                dragProps={{
                  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
                    // Prevent text selection during drag
                    (e.currentTarget.parentNode as HTMLElement)?.setAttribute('draggable', 'true');
                  },
                  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget.parentNode as HTMLElement)?.setAttribute('draggable', 'false');
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
