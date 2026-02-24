import { useCallback } from 'react';
import {
  JourneySegmentDraft,
  JourneySegmentIntent,
  LocationRef,
  SegmentType,
  Destination,
} from '@/lib/types';
import { createSegmentTemplate } from '@/lib/segment-templates';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { defaultEndTime } from '@/lib/datetime-utils';

const createEmptyLocation = (): LocationRef => ({
  type: 'custom',
  name: '',
});

const createEmptySegment = (
  order: number,
  timezone?: string
): JourneySegmentDraft => ({
  segment_type: 'TRANSFER',
  origin: createEmptyLocation(),
  destination: createEmptyLocation(),
  order,
  metadata: {},
  origin_timezone: timezone,
  destination_timezone: timezone,
});

const createLayoverSegment = (
  order: number,
  location: LocationRef,
  timezone?: string
): JourneySegmentDraft => ({
  segment_type: 'LAYOVER',
  origin: location,
  destination: location,
  order,
  metadata: {},
  origin_timezone: timezone,
  destination_timezone: timezone,
});

const reindexSegments = (segments: JourneySegmentDraft[]): JourneySegmentDraft[] =>
  segments.map((segment, index) => ({ ...segment, order: index }));

const isLocationEmpty = (location: LocationRef): boolean =>
  !location.destination_id && !location.name;

const locationsMatch = (left: LocationRef, right: LocationRef): boolean => {
  if (left.destination_id && right.destination_id) {
    return left.destination_id === right.destination_id;
  }
  if (left.name && right.name) {
    return left.name.trim().toLowerCase() === right.name.trim().toLowerCase();
  }
  return false;
};

/**
 * Cascade an arrival timezone forward through all ground segments that follow
 * the segment at `fromIndex`, until we hit the next FLIGHT (which has its own
 * origin timezone from the departure airport).
 *
 * Rule:
 *   - TRANSFER / BUS / RAIL / LAYOVER / STOP  → set both origin + destination TZ
 *   - FLIGHT → set origin_timezone only (they land somewhere else), then stop cascade
 *
 * Any segment that already has an explicitly-chosen airport timezone for
 * origin (via AirportAutocomplete) is NOT overwritten — we only overwrite
 * if the segment's current origin_timezone is undefined or matches the old value.
 */
const cascadeTimezoneForward = (
  segments: JourneySegmentDraft[],
  fromIndex: number,
  timezone: string,
  previousTimezone?: string
): JourneySegmentDraft[] => {
  const next = [...segments];
  for (let i = fromIndex + 1; i < next.length; i++) {
    const seg = next[i];
    // If this segment is a FLIGHT it departs from the arrival city — set its
    // origin_timezone then stop (its destination_timezone is a different airport)
    if (seg.segment_type === 'FLIGHT') {
      const originTzIsDefault =
        !seg.origin_timezone ||
        seg.origin_timezone === previousTimezone ||
        seg.origin_timezone === timezone;
      if (originTzIsDefault) {
        next[i] = { ...seg, origin_timezone: timezone };
      }
      break; // stop cascade — FLIGHT destination is a different timezone
    }
    // Ground / dwell segments: set both sides to arrival timezone
    next[i] = {
      ...seg,
      origin_timezone: timezone,
      destination_timezone: timezone,
    };
  }
  return next;
};

interface SegmentBuilderActions {
  applyIntent: (intent: JourneySegmentIntent) => void;
  addSegment: () => void;
  removeSegment: (index: number) => void;
  addLayoverAfterFirstFlight: () => void;
  updateSegmentType: (index: number, segmentType: SegmentType) => void;
  updateLocation: (index: number, side: 'origin' | 'destination', location: LocationRef, explicitTimezone?: string) => void;
  updateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  updateSegmentAt: (index: number, partial: Partial<JourneySegmentDraft>) => void;
  propagateTimeForward: (segments: JourneySegmentDraft[], targetIdx: number, force: boolean) => JourneySegmentDraft[];
  propagateMetaForward: (segments: JourneySegmentDraft[], targetIdx: number) => JourneySegmentDraft[];
}

export const useSegmentBuilder = (
  segments: JourneySegmentDraft[],
  setSegments: (segments: JourneySegmentDraft[]) => void,
  options?: { timezone?: string; startDate?: Date; destinations?: Destination[] }
): SegmentBuilderActions => {
  const resolveTimezone = (location: LocationRef): string | undefined => {
    if (!options?.destinations?.length) return undefined;

    if (location.destination_id) {
      return options.destinations.find((dest) => dest.id === location.destination_id)?.timezone;
    }

    const name = location.name?.trim().toLowerCase();
    if (!name) return undefined;
    const matchedTimezone = options.destinations.find(
      (dest) => dest.name.trim().toLowerCase() === name
    )?.timezone;
    if (matchedTimezone) return matchedTimezone;

    if (name.includes('home')) {
      return getLocalTimezone();
    }

    return undefined;
  };
  const applyIntent = useCallback(
    (intent: JourneySegmentIntent) => {
      const template = createSegmentTemplate(intent, {
        timezone: options?.timezone,
        startDate: options?.startDate,
      });
      setSegments(reindexSegments(template));
    },
    [options?.startDate, options?.timezone, setSegments]
  );

  const addSegment = useCallback(() => {
    const lastSegment = segments[segments.length - 1];
    const inheritedTimezone = lastSegment?.destination_timezone || options?.timezone;

    setSegments(
      reindexSegments([
        ...segments,
        createEmptySegment(segments.length, inheritedTimezone),
      ])
    );
  }, [options?.timezone, segments, setSegments]);

  const removeSegment = useCallback(
    (index: number) => {
      const next = segments.filter((_, idx) => idx !== index);
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  const addLayoverAfterFirstFlight = useCallback(() => {
    const flightIndex = segments.findIndex((segment) => segment.segment_type === 'FLIGHT');
    const insertIndex = flightIndex === -1 ? segments.length : flightIndex + 1;
    const referenceSegment = segments[flightIndex];
    const layoverLocation = referenceSegment?.destination ?? createEmptyLocation();
    const layoverTimezone = referenceSegment?.destination_timezone ?? options?.timezone;
    const layoverSegment = createLayoverSegment(
      insertIndex,
      layoverLocation,
      layoverTimezone
    );

    const next = [...segments];
    next.splice(insertIndex, 0, layoverSegment);
    if (next[insertIndex + 1]) {
      next[insertIndex + 1] = {
        ...next[insertIndex + 1],
        origin: layoverLocation,
      };
    }
    setSegments(reindexSegments(next));
  }, [options?.timezone, segments, setSegments]);

  const updateSegmentType = useCallback(
    (index: number, segmentType: SegmentType) => {
      const next = [...segments];
      next[index] = { ...next[index], segment_type: segmentType };
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  const updateLocation = useCallback(
    (index: number, side: 'origin' | 'destination', location: LocationRef, explicitTimezone?: string) => {
      let next = [...segments];
      const current = next[index];
      const previousDestination = current.destination;

      const matchedTimezone = explicitTimezone ?? resolveTimezone(location);

      next[index] = { ...current, [side]: location };

      if (matchedTimezone) {
        if (side === 'origin') {
          next[index] = { ...next[index], origin_timezone: matchedTimezone };
        } else {
          const previousTz = current.destination_timezone;
          next[index] = { ...next[index], destination_timezone: matchedTimezone };
          // Cascade arrival timezone forward through all onward ground segments
          next = cascadeTimezoneForward(next, index, matchedTimezone, previousTz);
        }
        if (current.segment_type === 'LAYOVER') {
          next[index] = {
            ...next[index],
            origin_timezone: matchedTimezone,
            destination_timezone: matchedTimezone,
          };
        }
      }

      if (side === 'destination' && next[index + 1]) {
        const nextSegment = next[index + 1];
        const shouldSync =
          isLocationEmpty(nextSegment.origin) ||
          locationsMatch(nextSegment.origin, previousDestination);

        if (shouldSync) {
          next[index + 1] = { ...nextSegment, origin: location };
          if (matchedTimezone) {
            next[index + 1] = {
              ...next[index + 1],
              origin_timezone: matchedTimezone,
            };
          }
        }
      }

      if (current.segment_type === 'FLIGHT' && next[index + 1]?.segment_type === 'LAYOVER') {
        next[index + 1] = {
          ...next[index + 1],
          origin: location,
          destination: location,
          origin_timezone: current.destination_timezone,
          destination_timezone: current.destination_timezone,
        };
      }

      if (current.segment_type === 'FLIGHT' && next[index - 1]?.segment_type === 'LAYOVER') {
        next[index - 1] = {
          ...next[index - 1],
          origin: location,
          destination: location,
          origin_timezone: current.origin_timezone,
          destination_timezone: current.origin_timezone,
        };
      }

      if (current.segment_type === 'LAYOVER') {
        const layoverLocation = location;
        const layoverTz = matchedTimezone ?? current.origin_timezone;
        if (next[index - 1]?.segment_type === 'FLIGHT') {
          next[index - 1] = {
            ...next[index - 1],
            destination: layoverLocation,
            destination_timezone: layoverTz,
          };
        }
        if (next[index + 1]?.segment_type === 'FLIGHT') {
          next[index + 1] = {
            ...next[index + 1],
            origin: layoverLocation,
            origin_timezone: layoverTz,
          };
        }
        next[index] = {
          ...next[index],
          origin: layoverLocation,
          destination: layoverLocation,
        };
      }

      setSegments(reindexSegments(next));
    },
    [segments, setSegments, resolveTimezone]
  );

  const updateField = useCallback(
    (index: number, field: keyof JourneySegmentDraft, value: unknown) => {
      let next = [...segments];
      next[index] = { ...next[index], [field]: value } as JourneySegmentDraft;

      // When destination_timezone changes on a FLIGHT, cascade it forward
      // through all ground segments until the next FLIGHT.
      if (field === 'destination_timezone' && typeof value === 'string') {
        const previousTz = segments[index].destination_timezone;
        next = cascadeTimezoneForward(next, index, value, previousTz);
      }

      // When origin_timezone changes (e.g. editing a ground segment manually),
      // also update the destination_timezone of the same segment if they were equal
      // (i.e. both sides in the same city) then cascade.
      if (field === 'origin_timezone' && typeof value === 'string') {
        const seg = next[index];
        if (
          !seg.destination_timezone ||
          seg.destination_timezone === segments[index].origin_timezone
        ) {
          next[index] = { ...next[index], destination_timezone: value };
          next = cascadeTimezoneForward(next, index, value, segments[index].origin_timezone);
        }
      }

      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  const updateSegmentAt = useCallback(
    (index: number, partial: Partial<JourneySegmentDraft>) => {
      const next = [...segments];
      next[index] = { ...next[index], ...partial } as JourneySegmentDraft;
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  const propagateTimeForward = useCallback(
    (currentSegments: JourneySegmentDraft[], targetIdx: number, force: boolean): JourneySegmentDraft[] => {
      if (targetIdx <= 0 || targetIdx >= currentSegments.length) return currentSegments;
      const prev = currentSegments[targetIdx - 1];
      const target = currentSegments[targetIdx];
      if (!prev.end_datetime) return currentSegments;
      if (!force && target.start_datetime) return currentSegments;

      const start = prev.end_datetime;
      const end = defaultEndTime(start); // Use actual date-fns utility

      return currentSegments.map((seg, i) =>
        i === targetIdx ? { ...seg, start_datetime: start, end_datetime: end } : seg
      );
    },
    []
  );

  const propagateMetaForward = useCallback(
    (currentSegments: JourneySegmentDraft[], targetIdx: number): JourneySegmentDraft[] => {
      const target = currentSegments[targetIdx];
      if (target?.segment_type !== 'LEG') return currentSegments;
      const targetMeta = (target.metadata ?? {}) as Record<string, unknown>;
      if (targetMeta.mode) return currentSegments;

      const sourceLeg = [...currentSegments.slice(0, targetIdx)]
        .reverse()
        .find((s) => s.segment_type === 'LEG' && s.metadata?.mode);
      if (!sourceLeg) return currentSegments;

      const sourceMeta = sourceLeg.metadata as Record<string, unknown>;
      const updates: Record<string, unknown> = { mode: sourceMeta.mode };
      const sourceSelectedIdx = sourceMeta.selected_segment_option as number | undefined;

      if (sourceSelectedIdx !== undefined && sourceSelectedIdx >= 0) {
        const sourceOpts = (sourceMeta.draft_segment_options ?? []) as Array<{ name: string; provider?: string }>;
        const sourceOpt = sourceOpts[sourceSelectedIdx];
        if (sourceOpt) {
          const targetOpts = (targetMeta.draft_segment_options ?? []) as Array<{ name: string; provider?: string }>;
          const matchIdx = targetOpts.findIndex((o) => o.name === sourceOpt.name);
          if (matchIdx >= 0) {
            updates.selected_segment_option = matchIdx;
            updates.provider = targetOpts[matchIdx].provider ?? targetOpts[matchIdx].name;
          }
        }
      }

      return currentSegments.map((seg, i) =>
        i === targetIdx ? { ...seg, metadata: { ...targetMeta, ...updates } } : seg
      );
    },
    []
  );

  return {
    applyIntent,
    addSegment,
    removeSegment,
    addLayoverAfterFirstFlight,
    updateSegmentType,
    updateLocation,
    updateField,
    updateSegmentAt,
    propagateTimeForward,
    propagateMetaForward,
  };
};
