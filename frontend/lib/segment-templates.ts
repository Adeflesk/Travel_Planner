import { JourneySegmentDraft, JourneySegmentIntent, SegmentType } from './types';

interface TemplateOptions {
  startDate?: Date;
  timezone?: string;
}

const defaultTimezone = 'UTC';

const buildSegment = (
  order: number,
  segment_type: SegmentType,
  originName: string,
  destinationName: string,
  options?: TemplateOptions
): JourneySegmentDraft => {
  const start_datetime = options?.startDate ? options.startDate.toISOString() : undefined;
  return {
    segment_type,
    origin: { type: 'custom', name: originName },
    destination: { type: 'custom', name: destinationName },
    start_datetime,
    end_datetime: undefined,
    origin_timezone: options?.timezone ?? defaultTimezone,
    destination_timezone: options?.timezone ?? defaultTimezone,
    metadata: {},
    order,
  };
};

export const createSegmentTemplate = (
  intent: JourneySegmentIntent,
  options?: TemplateOptions
): JourneySegmentDraft[] => {
  switch (intent) {
    case 'AIR_TRAVEL':
      return [
        buildSegment(0, 'TRANSFER', 'Home', 'Airport', options),
        buildSegment(1, 'FLIGHT', 'Airport', 'Destination Airport', options),
        buildSegment(2, 'TRANSFER', 'Airport', 'Hotel', options),
      ];
    case 'AIR_LAYOVER':
      return [
        buildSegment(0, 'TRANSFER', 'Home', 'Airport', options),
        buildSegment(1, 'FLIGHT', 'Airport', 'Hub', options),
        buildSegment(2, 'LAYOVER', 'Hub', 'Hub', options),
        buildSegment(3, 'FLIGHT', 'Hub', 'Destination Airport', options),
        buildSegment(4, 'TRANSFER', 'Airport', 'Hotel', options),
      ];
    case 'MULTI_STOP':
      return [
        buildSegment(0, 'TRANSFER', 'Start', 'Stop 1', options),
        buildSegment(1, 'STOP', 'Stop 1', 'Stop 1', options),
        buildSegment(2, 'TRANSFER', 'Stop 1', 'Final', options),
      ];
    case 'SIMPLE':
    default:
      return [buildSegment(0, 'TRANSFER', 'Start', 'End', options)];
  }
};
