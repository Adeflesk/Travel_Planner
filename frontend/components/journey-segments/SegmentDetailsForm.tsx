import { JourneySegmentDraft } from '@/lib/types';
import Input from '@/components/ui/Input';

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

interface SegmentDetailsFormProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
}

export const SegmentDetailsForm = ({ segment, index, onUpdateField }: SegmentDetailsFormProps) => {
  const meta = segment.metadata ?? {};
  const updateMeta = (updates: Record<string, unknown>) =>
    onUpdateField(index, 'metadata', { ...meta, ...updates });

  const rawMode = String(meta.mode ?? '');
  const isCustomMode = rawMode !== '' && !transferModeOptions.some((o) => o.value === rawMode);

  return (
    <>
      {/* Cost section — all types except STOP */}
      {segment.segment_type !== 'STOP' && (
        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cost</div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={String(meta.cost ?? '')}
              onChange={(e) => updateMeta({ cost: e.target.value })}
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <select
                value={String(meta.currency ?? 'USD')}
                onChange={(e) => updateMeta({ currency: e.target.value })}
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
                  checked={Boolean(meta.booked)}
                  onChange={(e) => updateMeta({ booked: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Booked
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(meta.paid)}
                  onChange={(e) => updateMeta({ paid: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Paid
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Transfer-specific fields */}
      {segment.segment_type === 'TRANSFER' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Transfer mode</label>
            <select
              value={isCustomMode ? '' : rawMode}
              onChange={(e) => updateMeta({ mode: e.target.value || undefined })}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
            >
              <option value="">Select mode</option>
              {transferModeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Custom mode"
            placeholder="e.g., Cable car"
            value={isCustomMode ? rawMode : ''}
            onChange={(e) => updateMeta({ mode: e.target.value })}
          />
          {rawMode === 'car' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(meta.parkingEnabled)}
                  onChange={(e) =>
                    updateMeta({
                      parkingEnabled: e.target.checked,
                      parkingCost: e.target.checked ? meta.parkingCost ?? '' : undefined,
                      parkingReference: e.target.checked ? meta.parkingReference ?? '' : undefined,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Add airport parking (activity + expense)
              </label>
              {Boolean(meta.parkingEnabled) && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    label="Parking cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={String(meta.parkingCost ?? '')}
                    onChange={(e) => updateMeta({ parkingCost: e.target.value })}
                  />
                  <Input
                    label="Reference"
                    placeholder="e.g., Confirmation code"
                    value={String(meta.parkingReference ?? '')}
                    onChange={(e) => updateMeta({ parkingReference: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
          <Input
            label="Provider"
            placeholder="e.g., Uber"
            value={String(meta.provider ?? '')}
            onChange={(e) => updateMeta({ provider: e.target.value })}
          />
          <Input
            label="Pickup notes"
            placeholder="e.g., Meet at arrivals"
            value={String(meta.pickupNotes ?? '')}
            onChange={(e) => updateMeta({ pickupNotes: e.target.value })}
          />
          <Input
            label="Drop-off notes"
            placeholder="e.g., Hotel lobby"
            value={String(meta.dropoffNotes ?? '')}
            onChange={(e) => updateMeta({ dropoffNotes: e.target.value })}
          />
        </>
      )}

      {/* Flight-specific fields */}
      {segment.segment_type === 'FLIGHT' && (
        <>
          <Input label="Carrier" placeholder="e.g., Delta" value={String(meta.carrier ?? '')} onChange={(e) => updateMeta({ carrier: e.target.value })} />
          <Input label="Flight number" placeholder="e.g., DL123" value={String(meta.flightNumber ?? '')} onChange={(e) => updateMeta({ flightNumber: e.target.value })} />
          <Input label="Terminal" placeholder="e.g., T2" value={String(meta.terminal ?? '')} onChange={(e) => updateMeta({ terminal: e.target.value })} />
          <Input label="Gate" placeholder="e.g., B12" value={String(meta.gate ?? '')} onChange={(e) => updateMeta({ gate: e.target.value })} />
          <Input label="Seat" placeholder="e.g., 12A" value={String(meta.seat ?? '')} onChange={(e) => updateMeta({ seat: e.target.value })} />
        </>
      )}

      {/* Layover-specific fields */}
      {segment.segment_type === 'LAYOVER' && (
        <>
          <Input label="Layover location" placeholder="e.g., AMS" value={String(meta.locationName ?? '')} onChange={(e) => updateMeta({ locationName: e.target.value })} />
          <Input label="Notes" placeholder="e.g., Terminal change" value={String(meta.notes ?? '')} onChange={(e) => updateMeta({ notes: e.target.value })} />
          <div className="md:col-span-2 text-xs text-slate-500">
            Layover timezone is auto-filled from the adjacent flight.
          </div>
        </>
      )}

      {/* Stop: pass-through toggle */}
      {segment.segment_type === 'STOP' && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(meta.passThrough)}
            onChange={(e) => updateMeta({ passThrough: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Pass-through stop
        </label>
      )}
    </>
  );
};
