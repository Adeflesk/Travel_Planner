'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface TripContext {
  home_base?: string;
  traveller_count: number;
  split_costs: boolean;
  trip_type: 'single_city' | 'multi_city' | 'road_trip' | 'international';
  vehicle: 'own_car' | 'rental' | 'none';
  flight_type: 'none' | 'return' | 'multi_leg' | 'comparing';
  accommodation: 'hotel' | 'rental_property' | 'camping' | 'mix' | 'unknown';
  pacing: 'relaxed' | 'balanced' | 'packed';
  budget_currency: string;
}

interface TripContextValue {
  tripId: number;
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string;   // ISO date string YYYY-MM-DD
  timezone?: string;
  tripContext?: TripContext | null;
  defaultCurrency: string;
}

const TripContextCtx = createContext<TripContextValue | null>(null);

interface TripProviderProps {
  tripId: number;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  tripContext?: TripContext | null;
  defaultCurrency?: string;
  children: ReactNode;
}

export function TripProvider({
  tripId,
  startDate,
  endDate,
  timezone,
  tripContext,
  defaultCurrency,
  children,
}: TripProviderProps) {
  const resolvedCurrency = defaultCurrency ?? tripContext?.budget_currency ?? 'USD';

  return (
    <TripContextCtx.Provider value={{ tripId, startDate, endDate, timezone, tripContext, defaultCurrency: resolvedCurrency }}>
      {children}
    </TripContextCtx.Provider>
  );
}

/**
 * Hook to access trip context for date constraints and smart defaults.
 * Returns null if used outside a TripProvider (e.g., trip creation form).
 */
export function useTripContext() {
  return useContext(TripContextCtx);
}

/**
 * Returns the default stop duration in hours based on trip pacing.
 *   relaxed → 4 h, balanced → 2 h (default), packed → 1 h
 */
export const stopDurationHours = (ctx: TripContext | null | undefined): number => {
  if (!ctx) return 2;
  return ctx.pacing === 'relaxed' ? 4 : ctx.pacing === 'packed' ? 1 : 2;
};

/**
 * Returns the trip's default currency for pre-filling cost forms.
 * Falls back to 'USD' when used outside a TripProvider.
 */
export function useTripCurrency(): string {
  const ctx = useContext(TripContextCtx);
  return ctx?.defaultCurrency ?? 'USD';
}
