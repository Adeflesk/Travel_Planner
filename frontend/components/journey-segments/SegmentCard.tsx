'use client';

import { useMemo, useState } from 'react';
import { JourneySegmentDraft, LocationRef, SegmentType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { getSupportedTimezones } from '@/lib/timezone-utils';

interface SegmentCardProps {
  segment: JourneySegmentDraft;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  onUpdateType: (index: number, segmentType: SegmentType) => void;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string) => void;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  hideToggle?: boolean;
}

const segmentTypes: SegmentType[] = [
  'TRANSFER',
  'BUS',
  'RAIL',
  'FLIGHT',
  'LAYOVER',
  'STOP',
];

const formatDateTimeInput = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : '';

export function SegmentCard({
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
}: SegmentCardProps) {
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const timezones = useMemo(() => getSupportedTimezones(), []);
  const metadataString = useMemo(
    () => JSON.stringify(segment.metadata ?? {}, null, 2),
    [segment.metadata]
  );

  const handleLocationTypeChange = (
    side: 'origin' | 'destination',
    type: LocationRef['type']
  ) => {
    const current = segment[side];
    const next: LocationRef = {
      ...current,
      type,
      destination_id: type === 'destination' ? current.destination_id : undefined,
    };
    onUpdateField(index, side, next);
  };

  const handleLocationIdChange = (
    side: 'origin' | 'destination',
    value: string
  ) => {
    const next: LocationRef = {
      ...segment[side],
      type: 'destination',
      destination_id: value ? parseInt(value, 10) : undefined,
    };
    onUpdateField(index, side, next);
  };

  const handleMetadataBlur = (value: string) => {
    if (!value.trim()) {
      onUpdateField(index, 'metadata', {});
      setMetadataError(null);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      onUpdateField(index, 'metadata', parsed);
      setMetadataError(null);
    } catch {
      setMetadataError('Metadata must be valid JSON');
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <div className="text-sm text-slate-500">Segment {index + 1}</div>
          <div className="text-sm font-semibold text-slate-900">
            {segment.segment_type}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hideToggle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggle(index)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          )}
          {canRemove && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onRemove(index)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Segment Type
            </label>
            <select
              value={segment.segment_type}
              onChange={(e) =>
                onUpdateType(index, e.target.value as SegmentType)
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {segmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(['origin', 'destination'] as const).map((side) => (
              <div key={side} className="space-y-2">
                <div className="text-xs font-medium text-slate-600">
                  {side === 'origin' ? 'Origin' : 'Destination'}
                </div>
                <select
                  value={segment[side].type}
                  onChange={(e) =>
                    handleLocationTypeChange(
                      side,
                      e.target.value as LocationRef['type']
                    )
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="custom">Custom</option>
                  <option value="destination">Destination</option>
                </select>

                {segment[side].type === 'destination' && (
                  <input
                    type="number"
                    value={segment[side].destination_id ?? ''}
                    onChange={(e) => handleLocationIdChange(side, e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Destination ID"
                    min={1}
                  />
                )}

                <input
                  type="text"
                  value={segment[side].name ?? ''}
                  onChange={(e) =>
                    onUpdateLocation(index, side, e.target.value)
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder={
                    segment[side].type === 'destination'
                      ? 'Display name (optional)'
                      : side === 'origin'
                        ? 'Enter origin'
                        : 'Enter destination'
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Start time
              </label>
              <input
                type="datetime-local"
                value={formatDateTimeInput(segment.start_datetime)}
                onChange={(e) =>
                  onUpdateField(
                    index,
                    'start_datetime',
                    e.target.value || undefined
                  )
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                End time
              </label>
              <input
                type="datetime-local"
                value={formatDateTimeInput(segment.end_datetime)}
                onChange={(e) =>
                  onUpdateField(
                    index,
                    'end_datetime',
                    e.target.value || undefined
                  )
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Origin timezone
              </label>
              <input
                list={`timezones-${index}`}
                value={segment.origin_timezone ?? ''}
                onChange={(e) =>
                  onUpdateField(
                    index,
                    'origin_timezone',
                    e.target.value || undefined
                  )
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="America/Denver"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Destination timezone
              </label>
              <input
                list={`timezones-${index}`}
                value={segment.destination_timezone ?? ''}
                onChange={(e) =>
                  onUpdateField(
                    index,
                    'destination_timezone',
                    e.target.value || undefined
                  )
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Europe/Dublin"
              />
            </div>
          </div>

          <datalist id={`timezones-${index}`}>
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Metadata (JSON)
            </label>
            <textarea
              key={metadataString}
              defaultValue={metadataString}
              onChange={() => setMetadataError(null)}
              onBlur={(e) => handleMetadataBlur(e.currentTarget.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
              rows={6}
            />
            {metadataError && (
              <div className="mt-1 text-xs text-red-600">{metadataError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
