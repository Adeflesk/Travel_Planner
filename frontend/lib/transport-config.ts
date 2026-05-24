import type { LucideIcon } from 'lucide-react';
import { Plane, TrainFront, Bus, Car, Ship, Rocket } from 'lucide-react';
import { TransportType } from './types';

/* ── Centralized icon & color maps ─────────────────────────────── */

export const TRANSPORT_ICON: Record<TransportType, LucideIcon> = {
  flight: Plane,
  train: TrainFront,
  bus: Bus,
  drive: Car,
  ferry: Ship,
  other: Rocket,
};

export const TRANSPORT_COLOR: Record<TransportType, string> = {
  flight: '#0EA5E9',   // sky-500
  train: '#8B5CF6',    // violet-500
  bus: '#22C55E',      // green-500
  drive: '#F59E0B',    // amber-500
  ferry: '#06B6D4',    // cyan-500
  other: '#94A3B8',    // slate-400
};

export const TRANSPORT_LABEL: Record<TransportType, string> = {
  flight: 'Flight',
  train: 'Train',
  bus: 'Bus',
  drive: 'Drive',
  ferry: 'Ferry',
  other: 'Other',
};

/* ── Per-type field config ─────────────────────────────────────── */

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
  showBooked: boolean;
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
    showBooked: true,
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
    showBooked: true,
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
    showBooked: true,
    overnightSupported: true,
  },
  drive: {
    showCarrier: false,
    showReference: false,
    showDistance: true,
    showTolls: true,
    showFrequency: false,
    showBooked: false,
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
    showBooked: true,
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
    showBooked: true,
    overnightSupported: true,
  },
};
