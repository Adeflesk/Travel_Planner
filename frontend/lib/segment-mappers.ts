import { JourneySegmentDraft, LocationRef } from './types';

export interface JourneySegmentPayload {
  segment_type: string;
  origin_id?: number;
  origin_name?: string;
  destination_id?: number;
  destination_name?: string;
  start_datetime?: string;
  end_datetime?: string;
  origin_timezone?: string;
  destination_timezone?: string;
  metadata?: Record<string, string | number | boolean | null>;
  order: number;
}

const resolveLocation = (location: LocationRef): { id?: number; name?: string } => {
  if (location.type === 'destination' && location.destination_id) {
    return { id: location.destination_id };
  }
  if (location.name) {
    return { name: location.name };
  }
  return {};
};

const normalizeMetadata = (
  metadata?: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> | undefined => {
  if (!metadata) return undefined;
  if (Object.keys(metadata).length === 0) return undefined;
  return metadata;
};

export const toJourneySegmentPayloads = (
  segments: JourneySegmentDraft[]
): JourneySegmentPayload[] =>
  segments.map((segment, index) => {
    const origin = resolveLocation(segment.origin);
    const destination = resolveLocation(segment.destination);

    return {
      segment_type: segment.segment_type,
      origin_id: origin.id,
      origin_name: origin.name,
      destination_id: destination.id,
      destination_name: destination.name,
      start_datetime: segment.start_datetime,
      end_datetime: segment.end_datetime,
      origin_timezone: segment.origin_timezone,
      destination_timezone: segment.destination_timezone,
      metadata: normalizeMetadata(segment.metadata),
      order: index,
    };
  });
