import { JourneySegmentDraft } from '@/lib/types';
import { SEG_STYLE } from './SegmentWizard';

interface RoadTripTimelineProps {
  segments: JourneySegmentDraft[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onAddStop: () => void;
}

export const RoadTripTimeline = ({ segments, selectedIdx, onSelect, onAddStop }: RoadTripTimelineProps) => (
  <div className="flex flex-col">
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
      Your route
    </div>

    <div className="relative flex flex-col gap-0">
      {segments.map((seg, idx) => {
        const s = SEG_STYLE[seg.segment_type] ?? SEG_STYLE.TRANSFER;
        const isSelected = idx === selectedIdx;
        const isStop = seg.segment_type === 'STOP';
        const label = seg.origin.name && seg.destination.name && seg.origin.name !== seg.destination.name
          ? `${seg.origin.name} → ${seg.destination.name}`
          : seg.origin.name || (isStop ? 'Stop' : 'Leg');

        return (
          <div key={idx} className="flex items-stretch gap-2">
            {/* Spine */}
            <div className="flex flex-col items-center w-6 shrink-0">
              <div className={`w-3 h-3 rounded-full ${s.dot} ring-2 ring-white shadow-sm mt-2 shrink-0`} />
              {idx < segments.length - 1 && (
                <div className="w-px flex-1 bg-slate-200 my-0.5" />
              )}
            </div>

            {/* Row button */}
            <button
              type="button"
              onClick={() => onSelect(idx)}
              className={`
                flex-1 min-w-0 text-left px-2.5 py-2 rounded-lg text-sm transition-all mb-1
                ${isSelected
                  ? `${s.badge} shadow-sm font-semibold`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                }
              `}
            >
              <span className="mr-1.5 text-xs leading-none">{s.icon}</span>
              <span className="truncate">{label}</span>
            </button>
          </div>
        );
      })}
    </div>

    <button
      type="button"
      onClick={onAddStop}
      className="mt-3 ml-8 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all text-left"
    >
      + Add stop
    </button>
  </div>
);
