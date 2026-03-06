'use client';

import { useState, useEffect } from 'react';
import { Accommodation } from '@/lib/types';
import { accommodationApi } from '@/lib/api';

export function useTripAccommodations(tripId: number) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);

  useEffect(() => {
    if (!tripId) return;
    accommodationApi
      .getByTrip(tripId)
      .then((res) => setAccommodations(res.data))
      .catch(() => setAccommodations([]));
  }, [tripId]);

  function getBadgeType(
    dateStr: string
  ): { type: 'check-in' | 'staying' | 'check-out'; accommodation: Accommodation } | null {
    const acc = accommodations.find(
      (a) => dateStr >= a.check_in_date && dateStr <= a.check_out_date
    );
    if (!acc) return null;
    if (dateStr === acc.check_in_date) return { type: 'check-in', accommodation: acc };
    if (dateStr === acc.check_out_date) return { type: 'check-out', accommodation: acc };
    return { type: 'staying', accommodation: acc };
  }

  return { accommodations, getBadgeType };
}
