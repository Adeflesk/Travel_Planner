'use client';
import { JourneySegmentDraft } from '@/lib/types';
import type { DraftStopOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { StopActivitiesList } from './StopActivitiesList';

interface StopFormProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, timezone?: string) => void;
}

export const StopForm = ({ segment, index, onUpdateField, onUpdateLocation }: StopFormProps) => {
  const meta = segment.metadata ?? {};
  const updateMeta = (updates: Record<string, unknown>) =>
    onUpdateField(index, 'metadata', { ...meta, ...updates });

  const stopOpts = (meta.draft_stop_options ?? []) as DraftStopOption[];
  const locationName = segment.origin.name ?? '';

  const handleLocationChange = (name: string) => {
    onUpdateLocation(index, 'origin', name);
    onUpdateLocation(index, 'destination', name);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stop location name */}
      <Input
        label="Stop name"
        placeholder="e.g., Grand Canyon"
        value={locationName}
        onChange={(e) => handleLocationChange(e.target.value)}
      />

      {/* Timing */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentTimingEditor segment={segment} index={index} onUpdateField={onUpdateField} />
      </div>

      {/* Pass-through toggle */}
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(meta.passThrough)}
          onChange={(e) => updateMeta({ passThrough: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Pass-through stop (no activities planned)
      </label>

      {/* Stop activities */}
      {!meta.passThrough && (
        <StopActivitiesList
          opts={stopOpts}
          onChange={(next) => updateMeta({ draft_stop_options: next })}
        />
      )}
    </div>
  );
};
