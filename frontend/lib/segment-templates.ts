import { JourneySegmentDraft, JourneySegmentIntent, SegmentType } from './types';
import { getLocalTimezone } from './timezone-utils';

interface TemplateOptions {
  startDate?: Date;
  timezone?: string;
}

const defaultTimezone = getLocalTimezone();
const defaultSegmentDurationMinutes = 120;

/** Draft stop option shape (stored in metadata until segment is saved to DB) */
export interface DraftStopOption {
  name: string;
  option_type: 'activity' | 'meal' | 'sightseeing' | 'rest' | 'fuel' | 'shopping' | 'other';
  estimated_duration?: number; // minutes
  estimated_cost?: number;
  notes?: string;
}

/** Draft transport option shape (stored in metadata until segment is saved to DB) */
export interface DraftSegmentOption {
  name: string;
  provider?: string;
  estimated_duration?: number; // minutes
  cost?: number;
  notes?: string;
}

const buildSegment = (
  order: number,
  segment_type: SegmentType,
  originName: string,
  destinationName: string,
  options?: TemplateOptions,
  metadata: Record<string, unknown> = {}
): JourneySegmentDraft => {
  const startDate = options?.startDate;
  const start_datetime = startDate ? startDate.toISOString() : undefined;
  const end_datetime = startDate
    ? new Date(startDate.getTime() + defaultSegmentDurationMinutes * 60000).toISOString()
    : undefined;
  return {
    segment_type,
    origin: { type: 'custom', name: originName },
    destination: { type: 'custom', name: destinationName },
    start_datetime,
    end_datetime,
    origin_timezone: options?.timezone ?? defaultTimezone,
    destination_timezone: options?.timezone ?? defaultTimezone,
    metadata,
    order,
  };
};

/** Build a LEG/TRANSFER/BUS/RAIL segment pre-populated with draft transport alternatives. */
const buildTransferSegment = (
  order: number,
  type: Extract<SegmentType, 'LEG' | 'TRANSFER' | 'BUS' | 'RAIL'>,
  originName: string,
  destinationName: string,
  segmentOptions: DraftSegmentOption[],
  options?: TemplateOptions
): JourneySegmentDraft =>
  buildSegment(order, type, originName, destinationName, options, {
    draft_segment_options: segmentOptions,
  });

/** Build a STOP segment pre-populated with draft activity/meal suggestions. */
const buildStopSegment = (
  order: number,
  locationName: string,
  stopOptions: DraftStopOption[],
  options?: TemplateOptions
): JourneySegmentDraft =>
  buildSegment(order, 'STOP', locationName, locationName, options, {
    draft_stop_options: stopOptions,
  });


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

    /**
     * ROAD_TRIP — drive → stop → drive → stop → drive
     * Each leg pre-populated with transport alternatives (Uber / Taxi / Self-drive)
     * and each stop pre-populated with activity/meal ideas.
     */
    case 'ROAD_TRIP':
      return [
        buildTransferSegment(
          0, 'LEG', 'Start', 'Stop 1',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 120 },
            { name: 'Uber', provider: 'Uber', estimated_duration: 130, notes: 'Book in advance' },
            { name: 'Taxi', provider: 'Local taxi', estimated_duration: 140 },
          ],
          options
        ),
        buildStopSegment(
          1, 'Stop 1',
          [
            { name: 'Lunch', option_type: 'meal', estimated_duration: 60, notes: 'Look for a local restaurant' },
            { name: 'Sightseeing', option_type: 'sightseeing', estimated_duration: 90 },
          ],
          options
        ),
        buildTransferSegment(
          2, 'LEG', 'Stop 1', 'Stop 2',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 90 },
            { name: 'Uber', provider: 'Uber', estimated_duration: 100 },
          ],
          options
        ),
        buildStopSegment(
          3, 'Stop 2',
          [
            { name: 'Activity', option_type: 'activity', estimated_duration: 120, notes: 'Check local listings' },
            { name: 'Coffee break', option_type: 'rest', estimated_duration: 30 },
          ],
          options
        ),
        buildTransferSegment(
          4, 'LEG', 'Stop 2', 'End',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 90 },
            { name: 'Uber', provider: 'Uber', estimated_duration: 100 },
            { name: 'Taxi', provider: 'Local taxi', estimated_duration: 110 },
          ],
          options
        ),
      ];

    /**
     * ROAD_TRIP_WITH_STOPS — extended road trip: 3 stops, mixed TRANSFER/BUS legs.
     * Ideal for a day tour or regional road trip with more planned structure.
     */
    case 'ROAD_TRIP_WITH_STOPS':
      return [
        buildTransferSegment(
          0, 'LEG', 'Home', 'Stop 1',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 60 },
            { name: 'Uber', provider: 'Uber', estimated_duration: 70 },
            { name: 'Taxi', provider: 'Local taxi', estimated_duration: 75 },
          ],
          options
        ),
        buildStopSegment(
          1, 'Stop 1',
          [
            { name: 'Breakfast', option_type: 'meal', estimated_duration: 45, notes: 'Café nearby' },
            { name: 'Morning activity', option_type: 'activity', estimated_duration: 90 },
          ],
          options
        ),
        buildTransferSegment(
          2, 'LEG', 'Stop 1', 'Stop 2',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 45 },
            { name: 'Uber', provider: 'Uber', estimated_duration: 50 },
          ],
          options
        ),
        buildStopSegment(
          3, 'Stop 2',
          [
            { name: 'Lunch', option_type: 'meal', estimated_duration: 60 },
            { name: 'Sightseeing', option_type: 'sightseeing', estimated_duration: 90, notes: 'Check opening hours' },
            { name: 'Shopping', option_type: 'shopping', estimated_duration: 45 },
          ],
          options
        ),
        buildTransferSegment(
          4, 'LEG', 'Stop 2', 'Stop 3',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 60 },
            { name: 'Bus', provider: 'Local bus', estimated_duration: 75, notes: 'Check timetable' },
          ],
          options
        ),
        buildStopSegment(
          5, 'Stop 3',
          [
            { name: 'Afternoon activity', option_type: 'activity', estimated_duration: 120 },
            { name: 'Dinner', option_type: 'meal', estimated_duration: 75, notes: 'Book ahead on weekends' },
          ],
          options
        ),
        buildTransferSegment(
          6, 'LEG', 'Stop 3', 'Home',
          [
            { name: 'Drive (self)', provider: 'Self', estimated_duration: 60 },
            { name: 'Uber', provider: 'Uber', estimated_duration: 70 },
            { name: 'Taxi', provider: 'Local taxi', estimated_duration: 75 },
          ],
          options
        ),
      ];

    case 'SIMPLE':
    default:
      return [buildSegment(0, 'TRANSFER', 'Start', 'End', options)];
  }
};
