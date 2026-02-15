import { useMemo } from 'react';
import { JourneySegmentDraft, SegmentType } from '@/lib/types';
import Input from '@/components/ui/Input';
import { AirportAutocomplete } from '@/components/ui/AirportAutocomplete';
import Button from '@/components/ui/Button';

const segmentTypeOptions: Array<{ value: SegmentType; label: string }> = [
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'BUS', label: 'Bus' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'LAYOVER', label: 'Layover' },
  { value: 'STOP', label: 'Stop' },
];

const toDatetimeLocal = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const fromDatetimeLocal = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

interface SegmentCardProps {
  segment: JourneySegmentDraft;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateType: (index: number, value: SegmentType) => void;
  onUpdateLocation: (
    index: number,
    side: 'origin' | 'destination',
    name: string
  ) => void;
  onUpdateField: (
    index: number,
    field: keyof JourneySegmentDraft,
    value: unknown
  ) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
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
}: SegmentCardProps) => {
  const summary = useMemo(() => {
    const origin = segment.origin.name || 'Origin';
    const destination = segment.destination.name || 'Destination';
    return `${origin} -> ${destination}`;
  }, [segment.origin.name, segment.destination.name]);

  const handleMetadataChange = (key: string, value: boolean) => {
    const nextMetadata = { ...(segment.metadata ?? {}), [key]: value };
    onUpdateField(index, 'metadata', nextMetadata);
  };

  const handleAirportChange = (
    side: 'origin' | 'destination',
    airport: { name: string; iata: string; timezone?: string } | null
  ) => {
    if (!airport) {
      onUpdateLocation(index, side, '');
      return;
    }
    onUpdateLocation(index, side, `${airport.name} (${airport.iata})`);
    if (side === 'origin') {
      onUpdateField(index, 'origin_timezone', airport.timezone);
    } else {
      onUpdateField(index, 'destination_timezone', airport.timezone);
    }
  };

  const handleLayoverAirportChange = (
    airport: { name: string; iata: string; timezone?: string } | null
  ) => {
    if (!airport) {
      onUpdateLocation(index, 'origin', '');
      onUpdateLocation(index, 'destination', '');
      return;
    }
    const label = `${airport.name} (${airport.iata})`;
    onUpdateLocation(index, 'origin', label);
    onUpdateLocation(index, 'destination', label);
    onUpdateField(index, 'origin_timezone', airport.timezone);
    onUpdateField(index, 'destination_timezone', airport.timezone);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <div className="text-sm text-slate-500">Segment {index + 1}</div>
          <div className="text-base font-semibold text-slate-900">
            {segment.segment_type} - {summary}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? 'Hide details' : 'Show details'}
          </Button>
          {canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select
              value={segment.segment_type}
              onChange={(event) => onUpdateType(index, event.target.value as SegmentType)}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
            >
              {segmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {segment.segment_type === 'FLIGHT' ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Origin airport</label>
              <AirportAutocomplete
                value={segment.origin.name || ''}
                onChange={(airport) => handleAirportChange('origin', airport)}
                placeholder="Search airports by name or code"
              />
            </div>
          ) : segment.segment_type === 'LAYOVER' ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Layover airport</label>
              <AirportAutocomplete
                value={segment.origin.name || ''}
                onChange={(airport) => handleLayoverAirportChange(airport)}
                placeholder="Search airports by name or code"
              />
            </div>
          ) : (
            <Input
              label="Origin"
              placeholder="Enter origin"
              value={segment.origin.name || ''}
              onChange={(event) => onUpdateLocation(index, 'origin', event.target.value)}
            />
          )}
          {segment.segment_type === 'FLIGHT' ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Destination airport</label>
              <AirportAutocomplete
                value={segment.destination.name || ''}
                onChange={(airport) => handleAirportChange('destination', airport)}
                placeholder="Search airports by name or code"
              />
            </div>
          ) : segment.segment_type === 'LAYOVER' ? (
            <div className="text-sm text-slate-500">
              Same airport for arrival and departure.
            </div>
          ) : (
            <Input
              label="Destination"
              placeholder="Enter destination"
              value={segment.destination.name || ''}
              onChange={(event) => onUpdateLocation(index, 'destination', event.target.value)}
            />
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Start time"
              type="datetime-local"
              value={toDatetimeLocal(segment.start_datetime)}
              onChange={(event) =>
                onUpdateField(index, 'start_datetime', fromDatetimeLocal(event.target.value))
              }
            />
            <Input
              label="End time"
              type="datetime-local"
              value={toDatetimeLocal(segment.end_datetime)}
              onChange={(event) =>
                onUpdateField(index, 'end_datetime', fromDatetimeLocal(event.target.value))
              }
            />
            {segment.segment_type !== 'FLIGHT' && (
              <Input
                label="Origin timezone"
                placeholder="UTC"
                value={segment.origin_timezone || ''}
                onChange={(event) => onUpdateField(index, 'origin_timezone', event.target.value)}
              />
            )}
            {segment.segment_type !== 'FLIGHT' && (
              <Input
                label="Destination timezone"
                placeholder="UTC"
                value={segment.destination_timezone || ''}
                onChange={(event) => onUpdateField(index, 'destination_timezone', event.target.value)}
              />
            )}
            {segment.segment_type === 'TRANSFER' && (
              <>
                <Input
                  label="Transfer mode"
                  placeholder="e.g., Taxi, Shuttle"
                  value={String(segment.metadata?.mode ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      mode: event.target.value,
                    })
                  }
                />
                <Input
                  label="Provider"
                  placeholder="e.g., Uber"
                  value={String(segment.metadata?.provider ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      provider: event.target.value,
                    })
                  }
                />
                <Input
                  label="Pickup notes"
                  placeholder="e.g., Meet at arrivals"
                  value={String(segment.metadata?.pickupNotes ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      pickupNotes: event.target.value,
                    })
                  }
                />
                <Input
                  label="Drop-off notes"
                  placeholder="e.g., Hotel lobby"
                  value={String(segment.metadata?.dropoffNotes ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      dropoffNotes: event.target.value,
                    })
                  }
                />
              </>
            )}
            {segment.segment_type === 'FLIGHT' && (
              <>
                <Input
                  label="Carrier"
                  placeholder="e.g., Delta"
                  value={String(segment.metadata?.carrier ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      carrier: event.target.value,
                    })
                  }
                />
                <Input
                  label="Flight number"
                  placeholder="e.g., DL123"
                  value={String(segment.metadata?.flightNumber ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      flightNumber: event.target.value,
                    })
                  }
                />
                <Input
                  label="Terminal"
                  placeholder="e.g., T2"
                  value={String(segment.metadata?.terminal ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      terminal: event.target.value,
                    })
                  }
                />
                <Input
                  label="Gate"
                  placeholder="e.g., B12"
                  value={String(segment.metadata?.gate ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      gate: event.target.value,
                    })
                  }
                />
                <Input
                  label="Seat"
                  placeholder="e.g., 12A"
                  value={String(segment.metadata?.seat ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      seat: event.target.value,
                    })
                  }
                />
              </>
            )}
            {segment.segment_type === 'LAYOVER' && (
              <>
                <Input
                  label="Layover location"
                  placeholder="e.g., AMS"
                  value={String(segment.metadata?.locationName ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      locationName: event.target.value,
                    })
                  }
                />
                <Input
                  label="Notes"
                  placeholder="e.g., Terminal change"
                  value={String(segment.metadata?.notes ?? '')}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      notes: event.target.value,
                    })
                  }
                />
                <div className="md:col-span-2 text-xs text-slate-500">
                  Layover timezone is auto-filled from the adjacent flight.
                </div>
              </>
            )}
            {segment.segment_type === 'STOP' && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(segment.metadata?.passThrough)}
                  onChange={(event) => handleMetadataChange('passThrough', event.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Pass-through stop
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
