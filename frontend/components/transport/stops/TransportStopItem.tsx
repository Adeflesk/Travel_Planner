import React, { useState } from 'react';
import { TransportStop, StopCategory, TransportStopUpdate } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit2, Move, Clock, MapPin, Sun } from 'lucide-react';

interface TransportStopItemProps {
  stop: TransportStop;
  onUpdate: (id: number, data: TransportStopUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}

const CATEGORY_LABELS: Record<StopCategory, string> = {
  viewpoint: 'Viewpoint',
  lunch: 'Lunch',
  fuel: 'Fuel',
  trailhead: 'Trailhead',
  photo: 'Photo',
  rest: 'Rest Stop',
  other: 'Stop',
};

export const TransportStopItem = ({ stop, onUpdate, onDelete, dragProps }: TransportStopItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stop.name);
  const [editDuration, setEditDuration] = useState<number | ''>(stop.duration_minutes ?? '');
  const [editDriveTime, setEditDriveTime] = useState<number | ''>(stop.drive_minutes_from_previous ?? '');
  const [editLocked, setEditLocked] = useState(stop.locked_arrival_time ?? '');
  const [loading, setLoading] = useState(false);

  const handleInlineSave = async () => {
    setLoading(true);
    try {
      await onUpdate(stop.id, {
        name: editName.trim(),
        duration_minutes: editDuration === '' ? null : editDuration,
        drive_minutes_from_previous: editDriveTime === '' ? null : editDriveTime,
        locked_arrival_time: editLocked || null,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 border border-slate-200 bg-indigo-50/20 rounded-xl">
        <div className="flex-1 space-y-2 md:space-y-0 md:flex md:items-center gap-2">
          <input
            type="text"
            className="w-full md:w-48 text-sm px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              placeholder="Drive (min)"
              className="w-24 text-sm px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              value={editDriveTime}
              onChange={(e) => setEditDriveTime(e.target.value === '' ? '' : parseInt(e.target.value))}
            />
            <input
              type="number"
              placeholder="Duration (min)"
              className="w-24 text-sm px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
            />
            <input
              type="text"
              placeholder="Locked time"
              pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
              className="w-24 text-sm px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              value={editLocked}
              onChange={(e) => setEditLocked(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleInlineSave} loading={loading}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border border-slate-100 bg-white rounded-xl shadow-sm hover:shadow transition-shadow group">
      {/* Drag handle placeholder / visual indicator */}
      <div {...dragProps} className="text-slate-300 hover:text-slate-500 cursor-grab shrink-0 p-1">
        <Move className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Title and Category */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 truncate">{stop.name}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
            {CATEGORY_LABELS[stop.category || 'other']}
          </span>
          {stop.requires_daylight && (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
        </div>

        {/* Small metadata row */}
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              Drive: {stop.drive_minutes_from_previous ?? 0}m | Dur: {stop.duration_minutes ?? 30}m
            </span>
          </div>
          {stop.locked_arrival_time && (
            <div className="flex items-center gap-1 text-indigo-600 font-medium">
              <span>Locked: {stop.locked_arrival_time}</span>
            </div>
          )}
          {stop.timezone && (
            <div className="flex items-center gap-1 text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>{stop.timezone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(stop.id)}>
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </Button>
      </div>
    </div>
  );
};
