import { JourneySegmentDraft } from '@/lib/types';
import type { DraftSegmentOption } from '@/lib/segment-templates';
import { SEG_STYLE } from './SegmentWizard';

interface JourneyReviewProps {
  segments: JourneySegmentDraft[];
  onEditSegment: (index: number) => void;
}

const formatDuration = (start?: string, end?: string): string => {
  if (!start || !end) return '';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
};

export const JourneyReview = ({ segments, onEditSegment }: JourneyReviewProps) => (
  <div>
    <div className="text-sm font-semibold text-slate-900 mb-4">
      Review your journey — {segments.length} segment{segments.length !== 1 ? 's' : ''}
    </div>

    <div className="relative">
      {segments.map((seg, idx) => {
        const s = SEG_STYLE[seg.segment_type] ?? SEG_STYLE.TRANSFER;
        const opts = (seg.metadata?.draft_segment_options ?? []) as DraftSegmentOption[];
        const selectedOptIdx = Number(seg.metadata?.selected_segment_option ?? -1);
        const selectedOpt = selectedOptIdx >= 0 ? opts[selectedOptIdx] : null;
        const duration = formatDuration(seg.start_datetime, seg.end_datetime);
        const cost = seg.metadata?.cost != null ? String(seg.metadata.cost) : null;
        const currency = String(seg.metadata?.currency ?? '');
        const isLast = idx === segments.length - 1;

        return (
          <div key={idx} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-3 h-3 rounded-full ${s.dot} mt-1.5 ring-2 ring-white shadow-sm`} />
              {!isLast && <div className="w-px flex-1 bg-slate-200 my-1 min-h-[1rem]" />}
            </div>

            {/* Row content */}
            <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-4'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* Type badge + meta chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold ${s.badge}`}>
                      <span className="leading-none">{s.icon}</span>
                      {s.label}
                    </span>
                    {duration && (
                      <span className="text-[11px] text-slate-400">⏱ {duration}</span>
                    )}
                    {cost && (
                      <span className="text-[11px] text-slate-400">
                        💰 {cost}{currency ? ` ${currency}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Route line */}
                  <div className="text-sm font-medium text-slate-800 leading-snug">
                    <span>{seg.origin.name || <span className="text-slate-400 italic">Origin</span>}</span>
                    <span className="mx-1.5 text-slate-300 text-xs">→</span>
                    <span>{seg.destination.name || <span className="text-slate-400 italic">Destination</span>}</span>
                  </div>

                  {selectedOpt && (
                    <div className="text-xs text-sky-600 mt-0.5">via {selectedOpt.name}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onEditSegment(idx)}
                  className="shrink-0 text-xs font-medium text-slate-400 hover:text-sky-600 px-2 py-1 rounded-md hover:bg-sky-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
