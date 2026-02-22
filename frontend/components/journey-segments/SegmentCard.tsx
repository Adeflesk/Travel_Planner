import { useMemo } from 'react';
import { JourneySegmentDraft, SegmentType } from '@/lib/types';
import Button from '@/components/ui/Button';
import type { DraftStopOption, DraftSegmentOption } from '@/lib/segment-templates';
import { SegmentLocationInputs } from './SegmentLocationInputs';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { SegmentDetailsForm } from './SegmentDetailsForm';
import { StopActivitiesList } from './StopActivitiesList';
import { TransportOptionCards } from './TransportOptionCards';

const segmentTypeOptions: Array<{ value: SegmentType; label: string }> = [
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'BUS', label: 'Bus' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'LAYOVER', label: 'Layover' },
  { value: 'STOP', label: 'Stop' },
];

interface SegmentCardProps {
  segment: JourneySegmentDraft;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateType: (index: number, value: SegmentType) => void;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, timezone?: string) => void;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  /** When true, details are always shown and the toggle button is hidden (wizard mode). */
  hideToggle?: boolean;
}

export const SegmentCard = ({
  segment,
  index,
  isExpanded,
  onToggle,
  onUpdateType,
  onUpdateLocation,
  onUpdateField,
  onRemove,
  canRemove,
  hideToggle,
}: SegmentCardProps) => {
  const summary = useMemo(() => {
    const origin = segment.origin.name || 'Origin';
    const destination = segment.destination.name || 'Destination';
    return `${origin} → ${destination}`;
  }, [segment.origin.name, segment.destination.name]);

  const meta = segment.metadata ?? {};
  const showDetails = hideToggle ? true : isExpanded;

  const isTransportSegment =
    segment.segment_type === 'TRANSFER' ||
    segment.segment_type === 'BUS' ||
    segment.segment_type === 'RAIL';

  const transportOpts = (meta.draft_segment_options ?? []) as DraftSegmentOption[];
  const stopOpts = (meta.draft_stop_options ?? []) as DraftStopOption[];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <div className="text-sm text-slate-500">Segment {index + 1}</div>
          <div className="text-base font-semibold text-slate-900">
            {segment.segment_type} — {summary}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hideToggle && (
            <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
              {isExpanded ? 'Hide details' : 'Show details'}
            </Button>
          )}
          {canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Type selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select
              value={segment.segment_type}
              onChange={(e) => onUpdateType(index, e.target.value as SegmentType)}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
            >
              {segmentTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Location inputs (renders 1–2 grid cells via Fragment) */}
          <SegmentLocationInputs
            segment={segment}
            index={index}
            onUpdateLocation={onUpdateLocation}
          />
        </div>

        {showDetails && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Timing */}
            <SegmentTimingEditor segment={segment} index={index} onUpdateField={onUpdateField} />

            {/* Type-specific details + cost */}
            <SegmentDetailsForm segment={segment} index={index} onUpdateField={onUpdateField} />

            {/* Stop activities (STOP segments) */}
            {segment.segment_type === 'STOP' && (
              <StopActivitiesList
                opts={stopOpts}
                onChange={(next) =>
                  onUpdateField(index, 'metadata', { ...meta, draft_stop_options: next })
                }
              />
            )}

            {/* Transport option cards (TRANSFER, BUS, RAIL) */}
            {isTransportSegment && (
              <TransportOptionCards
                opts={transportOpts}
                selectedIdx={transportOpts.length > 0 ? Number(meta.selected_segment_option ?? -1) : null}
                onChange={(next) =>
                  onUpdateField(index, 'metadata', { ...meta, draft_segment_options: next })
                }
                onSelect={(oi, opt) =>
                  onUpdateField(index, 'metadata', {
                    ...meta,
                    selected_segment_option: oi,
                    provider: opt.provider ?? opt.name,
                  })
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
