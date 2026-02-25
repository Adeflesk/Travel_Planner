import { useMemo, useState } from 'react';
import { Destination, JourneySegmentDraft, JourneySegmentIntent } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import Button from '@/components/ui/Button';
import { SegmentCard } from './SegmentCard';
import { useSegmentBuilder } from './useSegmentBuilder';

interface SegmentBuilderProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
}

const intentOptions: Array<{ value: JourneySegmentIntent; label: string; helper: string; icon: string }> = [
  {
    value: 'SIMPLE',
    label: 'Simple',
    helper: 'A to B with one segment.',
    icon: '→',
  },
  {
    value: 'AIR_TRAVEL',
    label: 'Air travel',
    helper: 'Transfers plus a flight segment.',
    icon: '✈️',
  },
  {
    value: 'AIR_LAYOVER',
    label: 'Air travel + layover',
    helper: 'Transfers, flights, and a layover.',
    icon: '🔄',
  },
  {
    value: 'MULTI_STOP',
    label: 'Multi-stop',
    helper: 'Transfer, stop, transfer.',
    icon: '📍',
  },
  {
    value: 'ROAD_TRIP',
    label: 'Road trip',
    helper: 'Drive → stop → drive → stop. Includes Uber/Taxi options and activity ideas.',
    icon: '🚗',
  },
  {
    value: 'ROAD_TRIP_WITH_STOPS',
    label: 'Extended road trip',
    helper: '3-stop road trip with meals, sightseeing and transport alternatives.',
    icon: '🗺️',
  },
];

export const SegmentBuilder = ({
  segments,
  onChange,
  defaultTimezone = getLocalTimezone(),
  destinations,
  startDate,
}: SegmentBuilderProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [selectedIntent, setSelectedIntent] = useState<JourneySegmentIntent>('SIMPLE');

  const {
    applyIntent,
    addSegment,
    removeSegment,
    addLayoverAfterFirstFlight,
    updateSegmentType,
    updateLocation,
    updateField,
  } = useSegmentBuilder(segments, onChange, {
    timezone: defaultTimezone,
    startDate: startDate ?? new Date(),
    destinations,
  });

  const handleIntentSelect = (intent: JourneySegmentIntent) => {
    setSelectedIntent(intent);
    applyIntent(intent);
    setExpandedIndex(0);
  };

  const canRemove = useMemo(() => segments.length > 1, [segments.length]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Segment builder</div>
          <p className="text-sm text-slate-600">
            Start with a template and adjust each segment as needed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {intentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleIntentSelect(option.value)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${selectedIntent === option.value
                  ? 'border-primary-500 bg-white shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span>{option.icon}</span>
                <span className="text-sm font-semibold text-slate-900">{option.label}</span>
              </div>
              <div className="text-xs text-slate-500">{option.helper}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">{segments.length} segments</div>
          <div className="flex flex-wrap items-center gap-2">
            {(selectedIntent === 'AIR_TRAVEL' || selectedIntent === 'AIR_LAYOVER') && (
              <Button type="button" variant="secondary" size="sm" onClick={addLayoverAfterFirstFlight}>
                Add layover
              </Button>
            )}
            {(selectedIntent === 'ROAD_TRIP' || selectedIntent === 'ROAD_TRIP_WITH_STOPS' || selectedIntent === 'MULTI_STOP') && (
              <Button type="button" variant="secondary" size="sm" onClick={addSegment}>
                Add stop
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={addSegment}>
              Add segment
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {segments.map((segment, index) => (
            <SegmentCard
              key={`segment-${index}`}
              segment={segment}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex((current) => (current === index ? null : index))
              }
              onUpdateType={updateSegmentType}
              onUpdateLocation={(idx, side, name) =>
                updateLocation(idx, side, { type: 'custom', name })
              }
              onUpdateField={updateField}
              onRemove={removeSegment}
              canRemove={canRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
