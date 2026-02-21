import { useMemo } from 'react';
import { JourneySegmentDraft, SegmentType } from '@/lib/types';
import Input from '@/components/ui/Input';
import { AirportAutocomplete } from '@/components/ui/AirportAutocomplete';
import Button from '@/components/ui/Button';
import { sanitizeTimezone, ensureUTC } from '@/lib/timezone-utils';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import type { DraftStopOption, DraftSegmentOption } from '@/lib/segment-templates';

// Template placeholder names that should be treated as empty / not-yet-set
const FLIGHT_PLACEHOLDERS = new Set(['Airport', 'Destination Airport', 'Hub']);

const segmentTypeOptions: Array<{ value: SegmentType; label: string }> = [
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'BUS', label: 'Bus' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'LAYOVER', label: 'Layover' },
  { value: 'STOP', label: 'Stop' },
];

const transferModeOptions: Array<{ value: string; label: string }> = [
  { value: 'car', label: 'Car' },
  { value: 'taxi', label: 'Taxi' },
  { value: 'ride_share', label: 'Ride share' },
  { value: 'bus', label: 'Bus' },
  { value: 'train', label: 'Train' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'walk', label: 'Walk' },
  { value: 'bike', label: 'Bike' },
  { value: 'tram', label: 'Tram' },
  { value: 'subway', label: 'Subway' },
  { value: 'shuttle', label: 'Shuttle' },
  { value: 'other', label: 'Other' },
];

const toDatetimeLocal = (value?: string): string => {
  if (!value) return '';
  return value.substring(0, 16);
};

const fromDatetimeLocal = (value: string): string | undefined => {
  if (!value) return undefined;
  // Always append :00 so backend parses it as a valid naive datetime
  return value.length === 16 ? `${value}:00` : value;
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

    const newTz = sanitizeTimezone(airport.timezone);
    if (side === 'origin') {
      onUpdateField(index, 'origin_timezone', newTz);
    } else {
      onUpdateField(index, 'destination_timezone', newTz);
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

    const tz = sanitizeTimezone(airport.timezone);
    onUpdateField(index, 'origin_timezone', tz);
    onUpdateField(index, 'destination_timezone', tz);
  };

  const rawTransferMode = String(segment.metadata?.mode ?? '');
  const isCustomTransferMode =
    rawTransferMode !== '' &&
    !transferModeOptions.some((option) => option.value === rawTransferMode);
  const selectTransferModeValue = isCustomTransferMode ? '' : rawTransferMode;
  const customTransferModeValue = isCustomTransferMode ? rawTransferMode : '';

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
                value={FLIGHT_PLACEHOLDERS.has(segment.origin.name || '') ? '' : (segment.origin.name || '')}
                onChange={(airport) => handleAirportChange('origin', airport)}
                onBlurFreeText={(text) => onUpdateLocation(index, 'origin', text)}
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
                value={FLIGHT_PLACEHOLDERS.has(segment.destination.name || '') ? '' : (segment.destination.name || '')}
                onChange={(airport) => handleAirportChange('destination', airport)}
                onBlurFreeText={(text) => onUpdateLocation(index, 'destination', text)}
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
            {/* ── Cost section (all transport segments except STOP) ── */}
            {segment.segment_type !== 'STOP' && (
              <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Cost
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={String(segment.metadata?.cost ?? '')}
                    onChange={(event) =>
                      onUpdateField(index, 'metadata', {
                        ...(segment.metadata ?? {}),
                        cost: event.target.value,
                      })
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Currency</label>
                    <select
                      value={String(segment.metadata?.currency ?? 'USD')}
                      onChange={(event) =>
                        onUpdateField(index, 'metadata', {
                          ...(segment.metadata ?? {}),
                          currency: event.target.value,
                        })
                      }
                      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                    >
                      {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(segment.metadata?.booked)}
                        onChange={(event) =>
                          onUpdateField(index, 'metadata', {
                            ...(segment.metadata ?? {}),
                            booked: event.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Booked
                    </label>
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(segment.metadata?.paid)}
                        onChange={(event) =>
                          onUpdateField(index, 'metadata', {
                            ...(segment.metadata ?? {}),
                            paid: event.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Paid
                    </label>
                  </div>
                </div>
              </div>
            )}
            {segment.segment_type === 'TRANSFER' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Transfer mode</label>
                  <select
                    value={selectTransferModeValue}
                    onChange={(event) =>
                      onUpdateField(index, 'metadata', {
                        ...(segment.metadata ?? {}),
                        mode: event.target.value || undefined,
                      })
                    }
                    className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
                  >
                    <option value="">Select mode</option>
                    {transferModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Custom mode"
                  placeholder="e.g., Cable car"
                  value={customTransferModeValue}
                  onChange={(event) =>
                    onUpdateField(index, 'metadata', {
                      ...(segment.metadata ?? {}),
                      mode: event.target.value,
                    })
                  }
                />
                {selectTransferModeValue === 'car' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(segment.metadata?.parkingEnabled)}
                        onChange={(event) =>
                          onUpdateField(index, 'metadata', {
                            ...(segment.metadata ?? {}),
                            parkingEnabled: event.target.checked,
                            parkingCost: event.target.checked
                              ? segment.metadata?.parkingCost ?? ''
                              : undefined,
                            parkingReference: event.target.checked
                              ? segment.metadata?.parkingReference ?? ''
                              : undefined,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Add airport parking (activity + expense)
                    </label>
                    {Boolean(segment.metadata?.parkingEnabled) ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          label="Parking cost"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={String(segment.metadata?.parkingCost ?? '')}
                          onChange={(event) =>
                            onUpdateField(index, 'metadata', {
                              ...(segment.metadata ?? {}),
                              parkingCost: event.target.value,
                            })
                          }
                        />
                        <Input
                          label="Reference"
                          placeholder="e.g., Confirmation code"
                          value={String(segment.metadata?.parkingReference ?? '')}
                          onChange={(event) =>
                            onUpdateField(index, 'metadata', {
                              ...(segment.metadata ?? {}),
                              parkingReference: event.target.value,
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                )}
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

            {/* ── Draft Stop Options (STOP segments from road trip templates) ── */}
            {segment.segment_type === 'STOP' && (() => {
              const opts = (segment.metadata?.draft_stop_options ?? []) as DraftStopOption[];
              const updateOpts = (next: DraftStopOption[]) =>
                onUpdateField(index, 'metadata', { ...(segment.metadata ?? {}), draft_stop_options: next });
              return (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">🎯 Stop options</div>
                    <button
                      type="button"
                      onClick={() => updateOpts([
                        ...opts,
                        { name: '', option_type: 'activity', estimated_duration: 60 },
                      ])}
                      className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                    >
                      + Add option
                    </button>
                  </div>
                  {opts.length === 0 && (
                    <p className="text-xs text-amber-600 italic">No options yet — add activities, meals, or sightseeing ideas.</p>
                  )}
                  <div className="flex flex-col gap-3">
                    {opts.map((opt, oi) => (
                      <div key={oi} className="rounded-md border border-amber-200 bg-white p-2.5 grid grid-cols-2 gap-2">
                        <Input
                          label="Name"
                          placeholder="e.g., Lunch at local café"
                          value={opt.name}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, name: e.target.value };
                            updateOpts(next);
                          }}
                        />
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-700">Type</label>
                          <select
                            value={opt.option_type}
                            onChange={(e) => {
                              const next = [...opts];
                              next[oi] = { ...opt, option_type: e.target.value as DraftStopOption['option_type'] };
                              updateOpts(next);
                            }}
                            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md px-2 py-1.5"
                          >
                            {(['activity', 'meal', 'sightseeing', 'rest', 'fuel', 'shopping', 'other'] as const).map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          label="Duration (min)"
                          type="number"
                          min="0"
                          placeholder="60"
                          value={String(opt.estimated_duration ?? '')}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, estimated_duration: Number(e.target.value) || undefined };
                            updateOpts(next);
                          }}
                        />
                        <Input
                          label="Est. cost"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={String(opt.estimated_cost ?? '')}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, estimated_cost: Number(e.target.value) || undefined };
                            updateOpts(next);
                          }}
                        />
                        <div className="col-span-2 flex items-center justify-between gap-2">
                          <Input
                            label="Notes"
                            placeholder="Optional notes"
                            value={opt.notes ?? ''}
                            onChange={(e) => {
                              const next = [...opts];
                              next[oi] = { ...opt, notes: e.target.value || undefined };
                              updateOpts(next);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateOpts(opts.filter((_, i) => i !== oi))}
                            className="mt-5 text-xs text-red-500 hover:text-red-700 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Draft Segment Options (TRANSFER/BUS/RAIL from road trip templates) ── */}
            {(segment.segment_type === 'TRANSFER' || segment.segment_type === 'BUS' || segment.segment_type === 'RAIL') && (() => {
              const opts = (segment.metadata?.draft_segment_options ?? []) as DraftSegmentOption[];
              if (opts.length === 0) return null; // only show if template pre-populated or user added
              const updateOpts = (next: DraftSegmentOption[]) =>
                onUpdateField(index, 'metadata', { ...(segment.metadata ?? {}), draft_segment_options: next });
              const selectedIdx = Number(segment.metadata?.selected_segment_option ?? -1);
              return (
                <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">🚗 Transport options</div>
                    <button
                      type="button"
                      onClick={() => updateOpts([
                        ...opts,
                        { name: '', provider: '', estimated_duration: 30 },
                      ])}
                      className="text-xs text-sky-700 hover:text-sky-900 font-medium"
                    >
                      + Add option
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {opts.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`rounded-md border p-2.5 grid grid-cols-2 gap-2 cursor-pointer transition-colors ${selectedIdx === oi
                          ? 'border-sky-400 bg-sky-100'
                          : 'border-sky-200 bg-white hover:border-sky-300'
                          }`}
                        onClick={() =>
                          onUpdateField(index, 'metadata', {
                            ...(segment.metadata ?? {}),
                            selected_segment_option: oi,
                            provider: opt.provider ?? opt.name,
                          })
                        }
                      >
                        <div className="col-span-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">
                            {selectedIdx === oi && <span className="text-sky-600 mr-1">✓</span>}
                            {opt.name || '(unnamed)'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateOpts(opts.filter((_, i) => i !== oi)); }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                        <Input
                          label="Option name"
                          placeholder="e.g., Uber"
                          value={opt.name}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, name: e.target.value };
                            updateOpts(next);
                          }}
                        />
                        <Input
                          label="Provider"
                          placeholder="e.g., Uber"
                          value={opt.provider ?? ''}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, provider: e.target.value };
                            updateOpts(next);
                          }}
                        />
                        <Input
                          label="Duration (min)"
                          type="number"
                          min="0"
                          value={String(opt.estimated_duration ?? '')}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, estimated_duration: Number(e.target.value) || undefined };
                            updateOpts(next);
                          }}
                        />
                        <Input
                          label="Est. cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(opt.cost ?? '')}
                          onChange={(e) => {
                            const next = [...opts];
                            next[oi] = { ...opt, cost: Number(e.target.value) || undefined };
                            updateOpts(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
