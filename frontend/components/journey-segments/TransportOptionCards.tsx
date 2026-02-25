import { useState } from 'react';
import type { DraftSegmentOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';

interface TransportOptionCardsProps {
  opts: DraftSegmentOption[];
  selectedIdx: number | null;
  onChange: (opts: DraftSegmentOption[]) => void;
  onSelect: (idx: number, opt: DraftSegmentOption) => void;
}

const formatDuration = (mins?: number): string => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
};

const emptyDraft = (): DraftSegmentOption => ({ name: '', provider: '', estimated_duration: 30 });

export const TransportOptionCards = ({
  opts,
  selectedIdx,
  onChange,
  onSelect,
}: TransportOptionCardsProps) => {
  const [adding, setAdding] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftSegmentOption>(emptyDraft);

  // Fastest = lowest estimated_duration (ignore undefined)
  const fastestIdx: number | null =
    opts.length > 1
      ? opts.reduce<number>((best, opt, i) =>
          (opt.estimated_duration ?? Infinity) < (opts[best].estimated_duration ?? Infinity) ? i : best,
        0)
      : null;

  // Cheapest = lowest cost where cost > 0
  const positiveCostIdx = opts.findIndex((o) => (o.cost ?? 0) > 0);
  const cheapestIdx: number | null =
    opts.length > 1 && positiveCostIdx >= 0
      ? opts.reduce<number>((best, opt, i) => {
          const c = opt.cost ?? Infinity;
          const bc = opts[best].cost ?? Infinity;
          return c < bc && c > 0 ? i : best;
        }, positiveCostIdx)
      : null;

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    onChange([...opts, draft]);
    setDraft(emptyDraft());
    setAdding(false);
  };

  const handleEditSave = () => {
    if (editingIdx === null) return;
    const next = [...opts];
    next[editingIdx] = draft;
    onChange(next);
    setEditingIdx(null);
    setDraft(emptyDraft());
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraft({ ...opts[idx] });
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setDraft(emptyDraft());
  };

  const handleRemove = (idx: number) => {
    onChange(opts.filter((_, i) => i !== idx));
    if (editingIdx === idx) cancelEdit();
  };

  return (
    <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">🚗 Transport options</div>
        {!adding && editingIdx === null && (
          <button
            type="button"
            onClick={() => { setAdding(true); setDraft(emptyDraft()); }}
            className="text-xs text-sky-700 hover:text-sky-900 font-medium"
          >
            + Add option
          </button>
        )}
      </div>

      {opts.length === 0 && !adding && (
        <p className="text-xs text-sky-600 italic mb-2">
          Add transport alternatives to compare cost and time at a glance.
        </p>
      )}

      {/* Cards grid */}
      {opts.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-3">
          {opts.map((opt, oi) => {
            const isSelected = selectedIdx === oi;
            const isFastest = fastestIdx === oi;
            const isCheapest = cheapestIdx === oi;

            // Inline edit form replaces the card
            if (editingIdx === oi) {
              return (
                <div key={oi} className="col-span-full rounded-lg border-2 border-sky-400 bg-white p-3">
                  <div className="text-xs font-semibold text-sky-700 mb-2">Edit option</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Name" value={draft.name} placeholder="e.g., Uber" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                    <Input label="Provider" value={draft.provider ?? ''} placeholder="e.g., Uber" onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))} />
                    <Input label="Duration (min)" type="number" min="0" value={String(draft.estimated_duration ?? '')} onChange={(e) => setDraft((d) => ({ ...d, estimated_duration: Number(e.target.value) || undefined }))} />
                    <Input label="Est. cost" type="number" min="0" step="0.01" value={String(draft.cost ?? '')} onChange={(e) => setDraft((d) => ({ ...d, cost: Number(e.target.value) || undefined }))} />
                    <Input label="Notes" placeholder="Optional" value={draft.notes ?? ''} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))} />
                    <div className="flex items-end gap-2">
                      <button type="button" onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 border border-slate-200 rounded">Cancel</button>
                      <button type="button" onClick={handleEditSave} className="text-xs bg-sky-600 text-white px-3 py-2 rounded hover:bg-sky-700">Save</button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={oi}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(oi, opt)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(oi, opt)}
                className={`relative rounded-lg border-2 p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-white shadow-md'
                    : 'border-sky-200 bg-white hover:border-sky-300 hover:shadow-sm'
                }`}
              >
                {/* Fastest / Cheapest badges */}
                {(isFastest || isCheapest) && (
                  <div className="absolute -top-2.5 left-2 flex gap-1">
                    {isFastest && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                        ⚡ Fastest
                      </span>
                    )}
                    {isCheapest && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        💸 Cheapest
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between gap-1 mt-1">
                  <div className="flex items-center gap-1 min-w-0">
                    {isSelected && <span className="text-sky-600 text-sm font-bold shrink-0">✓</span>}
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {opt.name || '(unnamed)'}
                    </span>
                  </div>
                  <div className="flex gap-0.5 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(oi); }}
                      className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(oi); }}
                      className="text-xs text-red-400 hover:text-red-600 p-1 rounded"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {opt.provider && opt.provider !== opt.name && (
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{opt.provider}</div>
                )}

                <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
                  <span>⏱ {formatDuration(opt.estimated_duration)}</span>
                  <span>💰 {opt.cost ? opt.cost.toLocaleString() : '—'}</span>
                </div>

                {opt.notes && (
                  <div className="mt-1.5 text-xs text-slate-400 italic truncate">{opt.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border-2 border-sky-400 bg-white p-3">
          <div className="text-xs font-semibold text-sky-700 mb-2">New option</div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Name" value={draft.name} placeholder="e.g., Uber" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            <Input label="Provider" value={draft.provider ?? ''} placeholder="e.g., Uber" onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))} />
            <Input label="Duration (min)" type="number" min="0" value={String(draft.estimated_duration ?? '')} onChange={(e) => setDraft((d) => ({ ...d, estimated_duration: Number(e.target.value) || undefined }))} />
            <Input label="Est. cost" type="number" min="0" step="0.01" value={String(draft.cost ?? '')} onChange={(e) => setDraft((d) => ({ ...d, cost: Number(e.target.value) || undefined }))} />
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded">Cancel</button>
              <button type="button" onClick={handleAdd} className="text-xs bg-sky-600 text-white px-3 py-1.5 rounded hover:bg-sky-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
