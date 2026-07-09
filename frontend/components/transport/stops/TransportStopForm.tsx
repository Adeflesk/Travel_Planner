import React, { useState } from 'react';
import { TransportStopCreate, StopCategory } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface TransportStopFormProps {
  onSave: (data: TransportStopCreate) => Promise<unknown>;
  onCancel: () => void;
}

const CATEGORIES: { value: StopCategory; label: string }[] = [
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'lunch', label: 'Lunch / Dining' },
  { value: 'fuel', label: 'Fuel / Gas' },
  { value: 'trailhead', label: 'Trailhead' },
  { value: 'photo', label: 'Photo Stop' },
  { value: 'rest', label: 'Rest Stop' },
  { value: 'other', label: 'Other' },
];

export const TransportStopForm = ({ onSave, onCancel }: TransportStopFormProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StopCategory>('other');
  const [duration, setDuration] = useState<number | ''>('');
  const [driveTime, setDriveTime] = useState<number | ''>('');
  const [lockedArrival, setLockedArrival] = useState('');
  const [timezone, setTimezone] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [requiresDaylight, setRequiresDaylight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        category,
        duration_minutes: duration === '' ? null : duration,
        drive_minutes_from_previous: driveTime === '' ? null : driveTime,
        locked_arrival_time: lockedArrival || null,
        timezone: timezone || null,
        latitude: latitude === '' ? null : latitude,
        longitude: longitude === '' ? null : longitude,
        requires_daylight: requiresDaylight,
      });
      onCancel();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save stop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
      <h3 className="font-semibold text-slate-800 text-sm">Add New Stop Along Leg</h3>

      {error && <div className="text-xs text-red-600 font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Stop Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Desert View Watchtower"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
          <select
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={category}
            onChange={(e) => setCategory(e.target.value as StopCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Locked arrival time */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Locked Arrival (HH:MM)</label>
          <input
            type="text"
            placeholder="e.g. 10:00"
            pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={lockedArrival}
            onChange={(e) => setLockedArrival(e.target.value)}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Duration (minutes)</label>
          <input
            type="number"
            min="0"
            placeholder="Default 30 min"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={duration}
            onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
          />
        </div>

        {/* Drive Time */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Drive from previous (minutes)</label>
          <input
            type="number"
            min="0"
            placeholder="Default 0 min"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={driveTime}
            onChange={(e) => setDriveTime(e.target.value === '' ? '' : parseInt(e.target.value))}
          />
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Timezone (optional)</label>
          <input
            type="text"
            placeholder="e.g. America/Phoenix"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>

        {/* Requires daylight */}
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="requiresDaylight"
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            checked={requiresDaylight}
            onChange={(e) => setRequiresDaylight(e.target.checked)}
          />
          <label htmlFor="requiresDaylight" className="text-xs font-medium text-slate-600 cursor-pointer">
            Requires daylight
          </label>
        </div>

        {/* Coordinates */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            placeholder="e.g. 38.57"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            placeholder="e.g. -109.55"
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" size="sm" loading={loading}>
          Save Stop
        </Button>
      </div>
    </form>
  );
};
