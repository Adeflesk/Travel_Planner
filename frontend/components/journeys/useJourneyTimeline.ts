'use client';

import { useCallback, useEffect, useState } from 'react';
import { journeyApi } from '@/lib/api';
import { JourneyTimelineResponse } from '@/lib/types';

interface UseJourneyTimelineResult {
  data: JourneyTimelineResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useJourneyTimeline(journeyId: number): UseJourneyTimelineResult {
  const [data, setData] = useState<JourneyTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await journeyApi.getTimeline(journeyId);
      setData(response.data);
    } catch (err) {
      console.error('Error loading journey timeline:', err);
      setError('Failed to load journey timeline');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  return {
    data,
    loading,
    error,
    refetch: loadTimeline,
  };
}

export default useJourneyTimeline;
