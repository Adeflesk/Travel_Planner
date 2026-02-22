'use client';
import { JourneySegmentDraft } from '@/lib/types';
import type { DraftSegmentOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';
import { SegmentLocationInputs } from './SegmentLocationInputs';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { TransportOptionCards } from './TransportOptionCards';

const legModeOptions = [
  { value: 'drive', label: 'Drive (own car)' },
  { value: 'rental', label: 'Rental car' },
  { value: 'hire', label: 'Hired / chartered' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'other', label: 'Other' },
];

interface LegFormProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, timezone?: string) => void;
}

export const LegForm = ({ segment, index, onUpdateField, onUpdateLocation }: LegFormProps) => {
  const meta = segment.metadata ?? {};
  const updateMeta = (updates: Record<string, unknown>) =>
    onUpdateField(index, 'metadata', { ...meta, ...updates });

  const transportOpts = (meta.draft_segment_options ?? []) as DraftSegmentOption[];

  return (
    <div className="flex flex-col gap-4">
      {/* Location */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentLocationInputs
          segment={segment}
          index={index}
          onUpdateLocation={onUpdateLocation}
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentTimingEditor segment={segment} index={index} onUpdateField={onUpdateField} />
      </div>

      {/* Mode + Distance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Mode</label>
          <select
            value={String(meta.mode ?? '')}
            onChange={(e) => updateMeta({ mode: e.target.value || undefined })}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select mode</option>
            {legModeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <Input
          label="Distance (km)"
          type="number"
          min="0"
          placeholder="e.g., 250"
          value={String(meta.distance ?? '')}
          onChange={(e) => updateMeta({ distance: e.target.value || undefined })}
        />
      </div>

      {/* Route notes */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">Route notes</label>
        <textarea
          value={String(meta.routeNotes ?? '')}
          onChange={(e) => updateMeta({ routeNotes: e.target.value || undefined })}
          placeholder="e.g., Take the coastal road, stop at the viewpoint"
          rows={2}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs resize-none"
        />
      </div>

      {/* Transport options */}
      <TransportOptionCards
        opts={transportOpts}
        selectedIdx={transportOpts.length > 0 ? Number(meta.selected_segment_option ?? -1) : null}
        onChange={(next) => updateMeta({ draft_segment_options: next })}
        onSelect={(oi, opt) => updateMeta({ selected_segment_option: oi, provider: opt.provider ?? opt.name })}
      />

      {/* Cost */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cost</div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={String(meta.cost ?? '')}
            onChange={(e) => updateMeta({ cost: e.target.value || undefined })}
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
    </div>
  );
};
