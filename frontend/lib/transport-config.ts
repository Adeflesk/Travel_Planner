import { TransportType } from './types';

export type TransportFieldConfig = {
  showCarrier: boolean;
  carrierLabel?: string;
  carrierPlaceholder?: string;
  showReference: boolean;
  referenceLabel?: string;
  referencePlaceholder?: string;
  showDistance: boolean;
  showTolls: boolean;
  showFrequency: boolean;
  overnightSupported: boolean;
};

export const TRANSPORT_CONFIG: Record<TransportType, TransportFieldConfig> = {
  flight: {
    showCarrier: true,
    carrierLabel: 'Airline',
    carrierPlaceholder: 'Emirates',
    showReference: true,
    referenceLabel: 'Flight number',
    referencePlaceholder: 'EK415',
    showDistance: false,
    showTolls: false,
    showFrequency: false,
    overnightSupported: true,
  },
  train: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'Renfe',
    showReference: true,
    referenceLabel: 'Train code',
    referencePlaceholder: 'AVE 3041',
    showDistance: false,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  bus: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'FlixBus',
    showReference: true,
    referenceLabel: 'Booking ref',
    referencePlaceholder: 'BK-123',
    showDistance: false,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  drive: {
    showCarrier: false,
    showReference: false,
    showDistance: true,
    showTolls: true,
    showFrequency: false,
    overnightSupported: false,
  },
  ferry: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'Brittany Ferries',
    showReference: true,
    referenceLabel: 'Booking ref',
    referencePlaceholder: 'BF-9876',
    showDistance: true,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  other: {
    showCarrier: true,
    carrierLabel: 'Carrier',
    // carrierPlaceholder intentionally omitted — too open-ended for "other"
    showReference: true,
    referenceLabel: 'Reference',
    // referencePlaceholder intentionally omitted — too open-ended for "other"
    showDistance: false,
    showTolls: false,
    showFrequency: false,
    overnightSupported: true,
  },
};
