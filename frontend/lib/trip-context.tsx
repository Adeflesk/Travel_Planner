'use client';

import { createContext, useContext, ReactNode } from 'react';

interface TripContextValue {
  tripId: number;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
}

const TripContext = createContext<TripContextValue | null>(null);

interface TripProviderProps {
  tripId: number;
  startDate: string;
  endDate: string;
  children: ReactNode;
}

export function TripProvider({ tripId, startDate, endDate, children }: TripProviderProps) {
  return (
    <TripContext.Provider value={{ tripId, startDate, endDate }}>
      {children}
    </TripContext.Provider>
  );
}

/**
 * Hook to access trip context for date constraints and smart defaults.
 * Returns null if used outside a TripProvider (e.g., trip creation form).
 */
export function useTripContext() {
  return useContext(TripContext);
}
