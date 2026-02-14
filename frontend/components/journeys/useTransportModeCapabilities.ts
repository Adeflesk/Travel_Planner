'use client';

import { useMemo } from 'react';
import {
  getTransportModeConfig,
  transportModeAllows,
  TransportModeFeature,
} from '@/lib/transportModeCapabilities';

export function useTransportModeCapabilities(transportMode: string) {
  const config = useMemo(() => {
    return getTransportModeConfig(transportMode);
  }, [transportMode]);

  const allows = useMemo(() => {
    return (feature: TransportModeFeature) => {
      return transportModeAllows(transportMode, feature);
    };
  }, [transportMode]);

  const canHaveLayovers = allows('layovers');
  const canHaveRouteDetails = allows('route_details');
  const canHaveBookingOptions = allows('booking_options');
  const canHaveBookingStatus = allows('booking_status');
  const canHaveFrequency = allows('frequency');

  const requiresExactTimes = config?.requiresExactTimes ?? true;
  const canBeFlexible = config?.canBeFlexible ?? false;
  const defaultFlexibility = config?.defaultFlexibility ?? 'exact';
  const defaultIsBooked = config?.defaultIsBooked ?? true;
  const hint = config?.hint ?? '';

  return {
    config,
    allows,
    // Feature flags
    canHaveLayovers,
    canHaveRouteDetails,
    canHaveBookingOptions,
    canHaveBookingStatus,
    canHaveFrequency,
    // Properties
    requiresExactTimes,
    canBeFlexible,
    defaultFlexibility,
    defaultIsBooked,
    hint,
  };
}
