'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface TripContextValue {
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripContextProvider({
  value,
  children,
}: {
  value: TripContextValue;
  children: ReactNode;
}) {
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTripContext() {
  return useContext(TripContext);
}
