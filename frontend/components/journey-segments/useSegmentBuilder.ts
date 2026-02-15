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

interface SegmentBuilderActions {
  applyIntent: (intent: JourneySegmentIntent) => void;
  addSegment: () => void;
  removeSegment: (index: number) => void;
  addLayoverAfterFirstFlight: () => void;
  updateSegmentType: (index: number, segmentType: SegmentType) => void;
  updateLocation: (index: number, side: 'origin' | 'destination', location: LocationRef) => void;
  updateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
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
    setSegments(
      reindexSegments([
        ...segments,
        createEmptySegment(segments.length, options?.timezone),
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
    (index: number, side: 'origin' | 'destination', location: LocationRef) => {
      const next = [...segments];
      const current = next[index];
      const previousDestination = current.destination;

      const matchedTimezone = resolveTimezone(location);

      next[index] = { ...current, [side]: location };

      if (matchedTimezone) {
        if (side === 'origin') {
          next[index] = { ...next[index], origin_timezone: matchedTimezone };
        } else {
          next[index] = { ...next[index], destination_timezone: matchedTimezone };
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
        if (next[index - 1]?.segment_type === 'FLIGHT') {
          next[index - 1] = {
            ...next[index - 1],
            destination: layoverLocation,
            destination_timezone: current.origin_timezone,
          };
        }
        if (next[index + 1]?.segment_type === 'FLIGHT') {
          next[index + 1] = {
            ...next[index + 1],
            origin: layoverLocation,
            origin_timezone: current.origin_timezone,
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
    [options?.destinations, segments, setSegments]
  );

  const updateField = useCallback(
    (index: number, field: keyof JourneySegmentDraft, value: unknown) => {
      const next = [...segments];
      next[index] = { ...next[index], [field]: value } as JourneySegmentDraft;
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  return {
    applyIntent,
    addSegment,
    removeSegment,
    addLayoverAfterFirstFlight,
    updateSegmentType,
    updateLocation,
    updateField,
  };
};
