'use client';
import { Destination, JourneySegmentDraft, JourneySegmentIntent } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { SegmentCard } from './SegmentCard';
import { useSegmentBuilder } from './useSegmentBuilder';
import { useSegmentWizard, WizardStep } from './useSegmentWizard';
import { JourneyReview } from './JourneyReview';
import { RoadTripBuilder } from './RoadTripBuilder';

// ─── Segment type visual config ───────────────────────────────────────────────

export const SEG_STYLE: Record<string, {
  dot: string;
  badge: string;
  border: string;
  icon: string;
  label: string;
}> = {
  FLIGHT:   { dot: 'bg-sky-500',      badge: 'bg-sky-50 text-sky-700 border-sky-200',      border: 'border-l-sky-400',     icon: '✈️', label: 'Flight'   },
  TRANSFER: { dot: 'bg-amber-400',    badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-400',   icon: '🚗', label: 'Transfer' },
  LEG:      { dot: 'bg-teal-500',     badge: 'bg-teal-50 text-teal-700 border-teal-200',     border: 'border-l-teal-400',    icon: '🛣️', label: 'Leg'     },
  BUS:      { dot: 'bg-emerald-500',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-emerald-400', icon: '🚌', label: 'Bus'  },
  RAIL:     { dot: 'bg-violet-500',   badge: 'bg-violet-50 text-violet-700 border-violet-200', border: 'border-l-violet-400',  icon: '🚆', label: 'Rail'  },
  LAYOVER:  { dot: 'bg-slate-400',    badge: 'bg-slate-100 text-slate-600 border-slate-200',  border: 'border-l-slate-300',   icon: '⏸️', label: 'Layover' },
  STOP:     { dot: 'bg-rose-500',     badge: 'bg-rose-50 text-rose-700 border-rose-200',     border: 'border-l-rose-400',    icon: '📍', label: 'Stop'   },
};

// ─── Template definitions ─────────────────────────────────────────────────────

const INTENT_OPTIONS: Array<{
  value: JourneySegmentIntent;
  label: string;
  helper: string;
  icon: string;
  chain: string[];
}> = [
  { value: 'SIMPLE',              label: 'Simple',              icon: '→',   chain: ['TRANSFER'],                                                              helper: 'One segment, origin to destination.' },
  { value: 'AIR_TRAVEL',          label: 'Air travel',          icon: '✈️',  chain: ['TRANSFER', 'FLIGHT', 'TRANSFER'],                                       helper: 'Transfer to airport, flight, transfer to hotel.' },
  { value: 'AIR_LAYOVER',         label: 'Air travel + layover',icon: '🔄',  chain: ['TRANSFER', 'FLIGHT', 'LAYOVER', 'FLIGHT', 'TRANSFER'],                  helper: 'Two flights with a connecting layover.' },
  { value: 'MULTI_STOP',          label: 'Multi-stop',          icon: '📍',  chain: ['LEG', 'STOP', 'LEG'],                                                   helper: 'Leg, a stop, then onward leg.' },
  { value: 'ROAD_TRIP',           label: 'Road trip',           icon: '🚗',  chain: ['LEG', 'STOP', 'LEG', 'STOP', 'LEG'],                                    helper: 'Drive with stops and transport alternatives.' },
  { value: 'ROAD_TRIP_WITH_STOPS',label: 'Extended road trip',  icon: '🗺️', chain: ['LEG', 'STOP', 'LEG', 'STOP', 'LEG', 'STOP', 'LEG'],                    helper: '3 stops with meals and activity ideas pre-filled.' },
];

// ─── Route chain preview ──────────────────────────────────────────────────────

function RouteChain({ chain }: { chain: string[] }) {
  return (
    <div className="flex items-center gap-0.5 mt-2.5 flex-wrap">
      {chain.map((type, i) => {
        const s = SEG_STYLE[type] ?? SEG_STYLE.TRANSFER;
        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && <span className="w-3.5 h-px bg-slate-200 shrink-0" />}
            <span
              className={`w-4 h-4 rounded-full ${s.dot} shrink-0 shadow-sm`}
              title={type}
            />
          </span>
        );
      })}
      <span className="ml-1.5 text-[11px] text-slate-400 font-medium">
        {chain.length} seg{chain.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: WizardStep[] = ['template', 'segments', 'review'];
const STEP_LABEL: Record<WizardStep, string> = { template: 'Template', segments: 'Segments', review: 'Review' };

function StepIndicator({ current, onNavigate }: { current: WizardStep; onNavigate: (s: WizardStep) => void }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center mb-5">
      {STEPS.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = s === current;
        return (
          <span key={s} className="flex items-center">
            {i > 0 && (
              <span className={`w-8 h-px mx-1.5 transition-colors ${isDone ? 'bg-sky-300' : 'bg-slate-200'}`} />
            )}
            <button type="button" onClick={() => onNavigate(s)} className="flex items-center gap-1.5 group">
              <span className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${isActive ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : ''}
                ${isDone ? 'bg-sky-100 text-sky-600' : ''}
                ${!isActive && !isDone ? 'bg-slate-100 text-slate-400 group-hover:bg-slate-200' : ''}
              `}>
                {isDone ? '✓' : i + 1}
              </span>
              <span className={`text-xs font-medium hidden sm:block transition-colors ${isActive ? 'text-slate-800' : isDone ? 'text-sky-500' : 'text-slate-400'}`}>
                {STEP_LABEL[s]}
              </span>
            </button>
          </span>
        );
      })}
    </div>
  );
}

// ─── Segment type tab strip ───────────────────────────────────────────────────

function SegmentTabs({ segments, currentIdx, onSelect }: {
  segments: JourneySegmentDraft[];
  currentIdx: number;
  onSelect: (i: number) => void;
}) {
  if (segments.length <= 1) return null;
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
      {segments.map((seg, i) => {
        const s = SEG_STYLE[seg.segment_type] ?? SEG_STYLE.TRANSFER;
        const isActive = i === currentIdx;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all border
              ${isActive ? `${s.badge} shadow-sm` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
            `}
          >
            <span className="leading-none">{s.icon}</span>
            <span className="hidden sm:block">{s.label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

interface SegmentWizardProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
}

export const SegmentWizard = ({
  segments,
  onChange,
  defaultTimezone = getLocalTimezone(),
  destinations,
  startDate,
}: SegmentWizardProps) => {
  const { step, intent, setIntent, isRoadTrip, currentSegmentIndex, goToStep, goToSegment, nextSegment, prevSegment, isFirstSegment, isLastSegment } =
    useSegmentWizard(segments.length);

  const { applyIntent, addSegment, removeSegment, addLayoverAfterFirstFlight, updateSegmentType, updateLocation, updateField } =
    useSegmentBuilder(segments, onChange, { timezone: defaultTimezone, startDate: startDate ?? new Date(), destinations });

  const handleUseTemplate = (chosen: JourneySegmentIntent) => { setIntent(chosen); applyIntent(chosen); goToStep('segments'); };
  const handleStartBlank  = () => { setIntent('SIMPLE'); applyIntent('SIMPLE'); goToStep('segments'); };

  const safeIdx      = Math.min(currentSegmentIndex, Math.max(0, segments.length - 1));
  const currentSeg   = segments[safeIdx];
  const currentStyle = currentSeg ? (SEG_STYLE[currentSeg.segment_type] ?? SEG_STYLE.TRANSFER) : SEG_STYLE.TRANSFER;
  const showAddLayover = intent === 'AIR_TRAVEL' || intent === 'AIR_LAYOVER';

  const containerClass = 'rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden';
  const footerClass    = 'px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between';

  // ── Step 1: Template picker ─────────────────────────────────────────────────
  if (step === 'template') {
    return (
      <div className={containerClass}>
        <div className="px-5 pt-5">
          <StepIndicator current={step} onNavigate={goToStep} />
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-900">Build your route</p>
            <p className="text-xs text-slate-500 mt-0.5">Choose a template, or start from scratch and add segments manually.</p>
          </div>
        </div>

        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTENT_OPTIONS.map((opt) => {
            const isSelected = intent === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntent(opt.value)}
                className={`
                  rounded-xl border-2 p-3.5 text-left transition-all group
                  ${isSelected
                    ? 'border-sky-400 bg-sky-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm leading-none">{opt.icon}</span>
                      <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{opt.helper}</p>
                  </div>
                  <span className={`
                    w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all
                    ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-slate-300 group-hover:border-slate-400'}
                  `}>
                    {isSelected && <span className="text-white text-[8px] font-black leading-none">✓</span>}
                  </span>
                </div>
                <RouteChain chain={opt.chain} />
              </button>
            );
          })}
        </div>

        <div className={footerClass}>
          <button
            type="button"
            onClick={handleStartBlank}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
          >
            Start blank
          </button>
          <button
            type="button"
            onClick={() => intent && handleUseTemplate(intent)}
            disabled={!intent}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Use template <span aria-hidden className="text-sky-200">→</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Segment editor ──────────────────────────────────────────────────
  if (step === 'segments') {
    // Road trip journeys get the dedicated two-column builder
    if (isRoadTrip) {
      return (
        <RoadTripBuilder
          segments={segments}
          onChange={onChange}
          defaultTimezone={defaultTimezone}
          destinations={destinations}
          startDate={startDate}
          onBack={() => goToStep('template')}
          onDone={() => goToStep('review')}
        />
      );
    }

    // All other intents use the step-by-step editor (existing code follows)
    return (
      <div className={containerClass}>
        <div className="px-5 pt-5">
          <StepIndicator current={step} onNavigate={goToStep} />
          <SegmentTabs segments={segments} currentIdx={safeIdx} onSelect={goToSegment} />

          {/* Progress */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="text-sm leading-none">{currentStyle.icon}</span>
              {currentStyle.label}
            </span>
            <span className="text-slate-400 tabular-nums">{safeIdx + 1} / {segments.length}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 mb-4">
            <div
              className="h-1 rounded-full bg-sky-400 transition-all duration-300"
              style={{ width: `${((safeIdx + 1) / segments.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Segment card with colored left-border accent */}
        {currentSeg && (
          <div className={`mx-5 mb-4 rounded-xl overflow-hidden border border-slate-200 border-l-4 ${currentStyle.border}`}>
            <SegmentCard
              segment={currentSeg}
              index={safeIdx}
              isExpanded={true}
              onToggle={() => {}}
              onUpdateType={updateSegmentType}
              onUpdateLocation={(idx, side, name, timezone) => updateLocation(idx, side, { type: 'custom', name }, timezone)}
              onUpdateField={updateField}
              onRemove={removeSegment}
              canRemove={false}
              hideToggle
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {showAddLayover && (
            <button type="button" onClick={addLayoverAfterFirstFlight}
              className="text-xs text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-full transition-colors">
              + Layover
            </button>
          )}
          <button type="button" onClick={addSegment}
            className="text-xs text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-full transition-colors">
            + Segment
          </button>
          {segments.length > 1 && (
            <button type="button" onClick={() => removeSegment(safeIdx)}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 bg-white hover:bg-red-50 px-2.5 py-1 rounded-full transition-colors">
              Remove
            </button>
          )}
        </div>

        <div className={footerClass}>
          <button type="button" onClick={prevSegment}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <span aria-hidden className="text-slate-400">←</span>
            {isFirstSegment ? 'Template' : 'Previous'}
          </button>
          <button type="button" onClick={nextSegment}
            className="flex items-center gap-1 text-xs font-semibold text-white px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 shadow-sm transition-colors">
            {isLastSegment ? 'Review' : 'Next'}
            <span aria-hidden className="text-sky-200">→</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Review ──────────────────────────────────────────────────────────
  return (
    <div className={containerClass}>
      <div className="px-5 pt-5 pb-4">
        <StepIndicator current={step} onNavigate={goToStep} />
        <JourneyReview segments={segments} onEditSegment={goToSegment} />
      </div>
      <div className={footerClass}>
        <button type="button" onClick={() => goToStep('segments')}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
          <span aria-hidden className="text-slate-400">←</span>
          Back to edit
        </button>
        <span className="text-xs text-slate-400">{segments.length} segment{segments.length !== 1 ? 's' : ''} ready</span>
      </div>
    </div>
  );
};
