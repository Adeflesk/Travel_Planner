import type { DraftStopOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';

interface StopActivitiesListProps {
  opts: DraftStopOption[];
  onChange: (opts: DraftStopOption[]) => void;
}

export const StopActivitiesList = ({ opts, onChange }: StopActivitiesListProps) => (
  <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">🎯 Stop options</div>
      <button
        type="button"
        onClick={() => onChange([...opts, { name: '', option_type: 'activity', estimated_duration: 60 }])}
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
              onChange(next);
            }}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Type</label>
            <select
              value={opt.option_type}
              onChange={(e) => {
                const next = [...opts];
                next[oi] = { ...opt, option_type: e.target.value as DraftStopOption['option_type'] };
                onChange(next);
              }}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md px-2 py-1.5"
            >
              {(['activity', 'meal', 'sightseeing', 'rest', 'fuel', 'shopping', 'other'] as const).map((t) => (
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
              onChange(next);
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
              onChange(next);
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
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(opts.filter((_, i) => i !== oi))}
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
