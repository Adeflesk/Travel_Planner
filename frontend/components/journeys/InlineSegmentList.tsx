'use client';

import { useCallback, useEffect, useState } from 'react';
import { JourneySegment, StopOption } from '@/lib/types';
import { journeySegmentApi, segmentStopOptionApi } from '@/lib/api';
import {
  Plane,
  Train,
  Bus,
  Car,
  MapPin,
  Coffee,
  ArrowRight,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  formatDateTimeWithZone,
  getTimezoneAbbreviation,
  calculateFlightDuration,
  formatDuration,
} from '@/lib/timezone-utils';

const segmentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  FLIGHT: Plane,
  RAIL: Train,
  BUS: Bus,
  TRANSFER: Car,
  LAYOVER: Coffee,
  STOP: MapPin,
};

const segmentColors: Record<string, string> = {
  FLIGHT: 'border-sky-300 bg-sky-50',
  RAIL: 'border-violet-300 bg-violet-50',
  BUS: 'border-green-300 bg-green-50',
  TRANSFER: 'border-amber-300 bg-amber-50',
  LAYOVER: 'border-gray-300 bg-gray-50',
  STOP: 'border-rose-300 bg-rose-50',
};

const stopOptionTypeIcons: Record<string, string> = {
  activity: '🎯',
  meal: '🍽️',
  sightseeing: '📸',
  rest: '☕',
  fuel: '⛽',
  shopping: '🛍️',
  other: '📌',
};

interface InlineSegmentListProps {
  journeyId: number;
}

export function InlineSegmentList({ journeyId }: InlineSegmentListProps) {
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [stopOptionsMap, setStopOptionsMap] = useState<Record<number, StopOption[]>>({});
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadSegments = useCallback(async () => {
    try {
      const res = await journeySegmentApi.getByJourneyId(journeyId);
      const segs = res.data;
      setSegments(segs);

      // Load stop options for STOP segments
      const stopSegs = segs.filter((s) => s.segment_type === 'STOP');
      const optionsEntries = await Promise.all(
        stopSegs.map(async (seg) => {
          try {
            const optRes = await segmentStopOptionApi.getBySegmentId(seg.id);
            return [seg.id, optRes.data] as [number, StopOption[]];
          } catch {
            return [seg.id, []] as [number, StopOption[]];
          }
        })
      );
      setStopOptionsMap(Object.fromEntries(optionsEntries));
    } catch {
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const toggleStopExpanded = (segmentId: number) => {
    setExpandedStops((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="px-4 py-3 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-gray-400 italic">
        No segments yet
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <div className="flex flex-wrap items-center gap-1">
        {segments.map((seg, idx) => {
          const Icon = segmentIcons[seg.segment_type] || MapPin;
          const colorClass = segmentColors[seg.segment_type] || 'border-gray-300 bg-gray-50';
          const isStop = seg.segment_type === 'STOP';
          const stopOptions = stopOptionsMap[seg.id] || [];
          const isExpanded = expandedStops.has(seg.id);
          const displayName =
            seg.destination_name || seg.origin_name || seg.segment_type;

          // ── Timezone-aware time display ──────────────────────────────────
          const depTz = seg.origin_timezone || undefined;
          const arrTz = seg.destination_timezone || undefined;

          const depFormatted = seg.start_datetime && depTz
            ? formatDateTimeWithZone(seg.start_datetime, depTz, { timeStyle: 'short' })
            : seg.start_datetime
              ? new Date(seg.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;

          const depTzAbbr = seg.start_datetime && depTz
            ? getTimezoneAbbreviation(seg.start_datetime, depTz)
            : null;

          const arrFormatted = seg.end_datetime && arrTz
            ? formatDateTimeWithZone(seg.end_datetime, arrTz, { timeStyle: 'short' })
            : seg.end_datetime
              ? new Date(seg.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;

          const arrTzAbbr = seg.end_datetime && arrTz
            ? getTimezoneAbbreviation(seg.end_datetime, arrTz)
            : null;

          const durationMins = seg.start_datetime && seg.end_datetime
            ? calculateFlightDuration(seg.start_datetime, seg.end_datetime, depTz, arrTz)
            : null;

          return (
            <div key={seg.id} className="flex items-center gap-1">
              {idx > 0 && (
                <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
              )}
              <div className="relative">
                <button
                  onClick={isStop ? () => toggleStopExpanded(seg.id) : undefined}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${colorClass} ${isStop ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{displayName}</span>
                  {isStop && stopOptions.length > 0 && (
                    <span className="text-[10px] text-gray-500">
                      ({stopOptions.length})
                    </span>
                  )}
                  {isStop && (
                    isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )
                  )}
                </button>

                {/* Stop Options Dropdown */}
                {isStop && isExpanded && stopOptions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1">
                    {stopOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-gray-50 text-xs"
                      >
                        <span>{stopOptionTypeIcons[opt.option_type] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">
                            {opt.name}
                          </div>
                          <div className="flex gap-3 text-gray-500 mt-0.5">
                            {opt.estimated_duration && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {opt.estimated_duration}m
                              </span>
                            )}
                            {opt.estimated_cost && (
                              <span className="flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3" />
                                {opt.estimated_cost} {opt.currency}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${opt.status === 'selected'
                            ? 'bg-green-100 text-green-700'
                            : opt.status === 'done'
                              ? 'bg-blue-100 text-blue-700'
                              : opt.status === 'skipped'
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                        >
                          {opt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Timezone-aware time display */}
                {(depFormatted || arrFormatted) && (
                  <div className="mt-0.5 text-[10px] text-gray-500 leading-tight">
                    {seg.segment_type === 'FLIGHT' && depFormatted && arrFormatted ? (
                      <span>
                        {depFormatted}{depTzAbbr ? ` ${depTzAbbr}` : ''}
                        {' → '}
                        {arrFormatted}{arrTzAbbr ? ` ${arrTzAbbr}` : ''}
                        {durationMins != null && durationMins > 0 && (
                          <span className="ml-1 text-gray-400">· {formatDuration(durationMins)}</span>
                        )}
                      </span>
                    ) : depFormatted ? (
                      <span>
                        {depFormatted}{depTzAbbr ? ` ${depTzAbbr}` : ''}
                        {arrFormatted && arrFormatted !== depFormatted && (
                          <> → {arrFormatted}{arrTzAbbr ? ` ${arrTzAbbr}` : ''}</>
                        )}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
