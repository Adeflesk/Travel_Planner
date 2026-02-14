/**
 * Transport Mode Capabilities
 * 
 * Defines what features each transport mode supports to keep the journey form clean.
 */

export type TransportModeFeature = 
  | 'layovers'           // Flight layovers/connections
  | 'route_details'      // Distance, driving time, route type, tolls
  | 'booking_options'    // Multiple booking options to compare
  | 'booking_status'     // Flexible booking (booked vs not booked)
  | 'frequency';         // Service frequency (every 30 min, hourly, etc.)

export type FlexibilityLevel = 'exact' | 'flexible' | 'very_flexible';

export interface TransportModeConfig {
  allows: TransportModeFeature[];
  requiresExactTimes: boolean;
  canBeFlexible: boolean;
  defaultFlexibility?: FlexibilityLevel;
  defaultIsBooked?: boolean;
  hint?: string;
}

export const transportModeCapabilities: Record<string, TransportModeConfig> = {
  flight: {
    allows: ['layovers', 'booking_status', 'booking_options'],
    requiresExactTimes: true,
    canBeFlexible: true,
    defaultIsBooked: true,
    hint: 'Flights typically have exact departure/arrival times and are booked in advance.',
  },
  
  shuttle: {
    allows: ['booking_status', 'booking_options', 'frequency'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultFlexibility: 'flexible',
    defaultIsBooked: false,
    hint: 'Airport shuttles run on regular schedules. Compare providers and book closer to arrival.',
  },
  
  bus: {
    allows: ['booking_status', 'booking_options', 'frequency'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultFlexibility: 'flexible',
    defaultIsBooked: false,
    hint: 'Buses have multiple departures throughout the day. Compare options before booking.',
  },
  
  train: {
    allows: ['booking_status', 'booking_options', 'frequency'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultFlexibility: 'flexible',
    defaultIsBooked: false,
    hint: 'Trains run frequently. Tickets often open 1-3 months before travel.',
  },
  
  taxi: {
    allows: ['booking_status', 'booking_options'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultFlexibility: 'very_flexible',
    defaultIsBooked: false,
    hint: 'On-demand airport transfer. Compare taxi vs rideshare and book when you land.',
  },
  
  uber: {
    allows: ['booking_status', 'booking_options'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultFlexibility: 'very_flexible',
    defaultIsBooked: false,
    hint: 'On-demand rideshare. Often best to book after arrival or when you are ready to leave.',
  },
  
  car: {
    allows: ['route_details'],
    requiresExactTimes: false,
    canBeFlexible: false,
    defaultIsBooked: true,
    hint: 'Road trip details: distance, route type, tolls, estimated driving time.',
  },
  
  ferry: {
    allows: ['booking_status', 'booking_options', 'frequency'],
    requiresExactTimes: true,
    canBeFlexible: true,
    defaultFlexibility: 'flexible',
    defaultIsBooked: false,
    hint: 'Ferries have scheduled departures. Book based on availability.',
  },
  
  metro: {
    allows: ['frequency'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultFlexibility: 'very_flexible',
    defaultIsBooked: true,
    hint: 'Metro/subway runs frequently. Usually no advance booking needed.',
  },
  
  walk: {
    allows: [],
    requiresExactTimes: false,
    canBeFlexible: false,
    defaultIsBooked: true,
    hint: 'Walking between locations.',
  },
  
  bike: {
    allows: [],
    requiresExactTimes: false,
    canBeFlexible: false,
    defaultIsBooked: true,
    hint: 'Biking between locations.',
  },
  
  other: {
    allows: ['booking_status', 'booking_options', 'frequency'],
    requiresExactTimes: false,
    canBeFlexible: true,
    defaultIsBooked: false,
    hint: 'Custom transport mode.',
  },
};

/**
 * Check if a transport mode supports a specific feature
 */
export function transportModeAllows(
  transportMode: string,
  feature: TransportModeFeature
): boolean {
  const config = transportModeCapabilities[transportMode];
  if (!config) return false;
  return config.allows.includes(feature);
}

/**
 * Get the configuration for a transport mode
 */
export function getTransportModeConfig(transportMode: string): TransportModeConfig | null {
  return transportModeCapabilities[transportMode] || null;
}
