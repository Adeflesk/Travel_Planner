'use client';
import { useState } from 'react';
import { Destination, JourneySegmentDraft } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { useSegmentBuilder } from './useSegmentBuilder';
import { RoadTripTimeline } from './RoadTripTimeline';
import { LegForm } from './LegForm';
import { StopForm } from './StopForm';

interface RoadTripBuilderProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
  onBack: () => void;
}

export const RoadTripBuilder = ({
  segments,
  onChange,
  defaultTimezone = getLocalTimezone(),
  destinations,
  startDate,
  onBack,
}: RoadTripBuilderProps) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { updateLocation, updateField } = useSegmentBuilder(segments, onChange, {
    timezone: defaultTimezone,
    startDate: startDate ?? new Date(),
    destinations,
  });

  const safeIdx = Math.min(selectedIdx, Math.max(0, segments.length - 1));
  const selectedSeg = segments[safeIdx];

  const handleUpdateLocation = (idx: number, side: 'origin' | 'destination', name: string, timezone?: string) =>
    updateLocation(idx, side, { type: 'custom', name }, timezone);

  const handleAddStop = () => {
    if (segments.length === 0) return;

    const lastSegIdx = segments.length - 1;
    const lastLeg = segments[lastSegIdx];
    const endDest = lastLeg?.destination.name ?? 'End';
    const stopNum = segments.filter((s) => s.segment_type === 'STOP').length + 1;
    const stopName = `Stop ${stopNum}`;

    const newStop: JourneySegmentDraft = {
      segment_type: 'STOP',
      origin: { type: 'custom', name: stopName },
      destination: { type: 'custom', name: stopName },
      origin_timezone: defaultTimezone,
      destination_timezone: defaultTimezone,
      order: segments.length,
      metadata: { draft_stop_options: [] },
    };

    const newLeg: JourneySegmentDraft = {
      segment_type: 'LEG',
      origin: { type: 'custom', name: stopName },
      destination: { type: 'custom', name: endDest },
      origin_timezone: defaultTimezone,
      destination_timezone: defaultTimezone,
      order: segments.length + 1,
      metadata: { draft_segment_options: [] },
    };

    // Redirect the previous last LEG's destination to the new stop
    const updated = segments.map((seg, i) =>
      i === lastSegIdx && seg.segment_type === 'LEG'
        ? { ...seg, destination: { type: 'custom' as const, name: stopName } }
        : seg
    );

    onChange([...updated, newStop, newLeg]);
    setSelectedIdx(segments.length); // select the new STOP
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Plan your route</p>
          <p className="text-xs text-slate-500 mt-0.5">Click any leg or stop to edit its details.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
        >
          ← Change template
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex min-h-[320px]">
        {/* Left: timeline */}
        <div className="w-48 shrink-0 border-r border-slate-100 p-4 bg-slate-50/50">
          <RoadTripTimeline
            segments={segments}
            selectedIdx={safeIdx}
            onSelect={setSelectedIdx}
            onAddStop={handleAddStop}
          />
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 min-w-0 p-5 overflow-y-auto">
          {segments.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No segments yet.</p>
          ) : selectedSeg?.segment_type === 'STOP' ? (
            <StopForm
              segment={selectedSeg}
              index={safeIdx}
              onUpdateField={updateField}
              onUpdateLocation={handleUpdateLocation}
            />
          ) : (
            <LegForm
              segment={selectedSeg}
              index={safeIdx}
              onUpdateField={updateField}
              onUpdateLocation={handleUpdateLocation}
            />
          )}
        </div>
      </div>
    </div>
  );
};
