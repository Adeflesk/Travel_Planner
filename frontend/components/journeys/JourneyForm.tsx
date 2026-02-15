'use client';

import { useMemo } from 'react';
import { JourneyFormData, Destination } from '@/lib/types';
import { ValidationErrors, ValidationWarnings } from './useJourneyForm';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { SegmentBuilder } from '@/components/journey-segments/SegmentBuilder';
import { useTripContext } from '@/lib/trip-context';
import { getDateTimeConstraints } from '@/lib/date-constraints';
import { getLocalTimezone } from '@/lib/timezone-utils';

interface JourneyFormProps {
  formData: JourneyFormData;
  isEditing: boolean;
  destinations: Destination[];
  errors?: ValidationErrors;
  warnings?: ValidationWarnings;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof JourneyFormData>(
    field: K,
    value: JourneyFormData[K]
  ) => void;
  carrierSuggestions?: string[];
  recentCarriers?: string[];
  loadingCarriers?: boolean;
}

export function JourneyForm({
  formData,
  isEditing,
  destinations,
  errors = {},
  warnings = {},
  onSubmit,
  onCancel,
  updateField,
}: JourneyFormProps) {
  // Get trip context for date constraints
  const tripContext = useTripContext();
  const localTimezone = getLocalTimezone();
  const tripTimezone = tripContext?.timezone || localTimezone;
  const getDestinationTimezone = (destinationId?: number) =>
    destinations.find((dest) => dest.id === destinationId)?.timezone;
  const defaultSegmentTimezone =
    formData.origin_timezone ||
    getDestinationTimezone(formData.origin_id) ||
    formData.destination_timezone ||
    getDestinationTimezone(formData.destination_id) ||
    tripTimezone;

  // Calculate date/time constraints based on trip dates
  const dateTimeConstraints = getDateTimeConstraints(
    tripContext?.startDate,
    tripContext?.endDate,
    {
      allowBeforeStart: true, // Allow booking flights before trip starts
      allowAfterEnd: true,     // Allow return flights after trip ends
      defaultTo: 'start',
      defaultTime: '09:00',
    }
  );
  const segmentStartDate = dateTimeConstraints.defaultDateTime
    ? new Date(dateTimeConstraints.defaultDateTime)
    : undefined;

  const segmentSummary = useMemo(() => {
    const segments = formData.segments ?? [];
    if (segments.length === 0) {
      return {
        title: 'No segments yet',
        subtitle: 'Build a segment plan to see a summary.',
        totalSegments: 0,
        startLabel: 'TBD',
        endLabel: 'TBD',
        totalDurationLabel: 'TBD',
        warnings: ['Add at least one segment to continue.'],
      };
    }

    const first = segments[0];
    const last = segments[segments.length - 1];
    const title = `${first.origin.name || 'Origin'} -> ${last.destination.name || 'Destination'}`;

    const parsedStarts = segments
      .map((segment) => (segment.start_datetime ? new Date(segment.start_datetime) : null))
      .filter((value): value is Date => value !== null && !Number.isNaN(value.getTime()));
    const parsedEnds = segments
      .map((segment) => (segment.end_datetime ? new Date(segment.end_datetime) : null))
      .filter((value): value is Date => value !== null && !Number.isNaN(value.getTime()));

    const start = parsedStarts.length > 0
      ? parsedStarts.sort((a, b) => a.getTime() - b.getTime())[0]
      : undefined;
    const end = parsedEnds.length > 0
      ? parsedEnds.sort((a, b) => b.getTime() - a.getTime())[0]
      : undefined;

    const formatDateTime = (date?: Date) => {
      if (!date) return 'TBD';
      return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    };

    const totalDurationLabel = start && end
      ? (() => {
        const diffMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes}m`;
      })()
      : 'TBD';

    const warnings: string[] = [];
    const missingTimes = segments.some((segment) => !segment.start_datetime || !segment.end_datetime);
    if (missingTimes) {
      warnings.push('Some segments are missing start or end times.');
    }

    const connectionThresholdMinutes = 45;
    segments.forEach((segment, index) => {
      const next = segments[index + 1];
      if (!next) return;
      if (!segment.end_datetime || !next.start_datetime) return;

      const endTime = new Date(segment.end_datetime);
      const nextStart = new Date(next.start_datetime);
      if (Number.isNaN(endTime.getTime()) || Number.isNaN(nextStart.getTime())) return;

      const gapMinutes = Math.floor((nextStart.getTime() - endTime.getTime()) / 60000);
      if (gapMinutes >= 0 && gapMinutes < connectionThresholdMinutes) {
        warnings.push(
          `Tight connection between segment ${index + 1} and ${index + 2} (${gapMinutes} min).`
        );
      }
      if (gapMinutes < 0) {
        warnings.push(
          `Segment ${index + 2} starts before segment ${index + 1} ends.`
        );
      }
    });

    return {
      title,
      subtitle: `${segments.length} segment${segments.length === 1 ? '' : 's'}`,
      totalSegments: segments.length,
      startLabel: formatDateTime(start),
      endLabel: formatDateTime(end),
      totalDurationLabel,
      warnings,
    };
  }, [formData.segments]);

  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          {isEditing ? 'Edit Journey' : 'Add Journey'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      </div>
      <div className="mb-6">
        <SegmentBuilder
          segments={formData.segments || []}
          onChange={(segments) => updateField('segments', segments)}
          defaultTimezone={defaultSegmentTimezone}
          destinations={destinations}
          startDate={segmentStartDate}
        />
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Segment summary</div>
            <div className="text-sm text-slate-600">{segmentSummary.title}</div>
            <div className="text-xs text-slate-500">{segmentSummary.subtitle}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-slate-700">
          <div>
            <div className="text-xs text-slate-500">Start</div>
            <div className="font-medium">{segmentSummary.startLabel}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">End</div>
            <div className="font-medium">{segmentSummary.endLabel}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Total duration</div>
            <div className="font-medium">{segmentSummary.totalDurationLabel}</div>
          </div>
        </div>
        {segmentSummary.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {segmentSummary.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-2 text-amber-700 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(errors.departure_arrival || warnings.outside_trip_dates) && (
        <div className="space-y-2">
          {errors.departure_arrival && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errors.departure_arrival}</span>
            </div>
          )}
          {warnings.outside_trip_dates && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{warnings.outside_trip_dates}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {isEditing ? 'Update Journey' : 'Add Journey'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
