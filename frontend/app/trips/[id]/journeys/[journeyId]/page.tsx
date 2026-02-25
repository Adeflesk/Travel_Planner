'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { journeyApi, tripApi } from '@/lib/api';
import { Journey, Trip } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import SegmentManager from '@/components/journey-segments/SegmentManager';

function JourneySegmentsContent() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);
  const journeyId = parseInt(params.journeyId as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tripResponse, journeyResponse] = await Promise.all([
          tripApi.getById(tripId),
          journeyApi.getById(journeyId),
        ]);
        setTrip(tripResponse.data);
        setJourney(journeyResponse.data);
      } catch (error) {
        console.error('Error loading journey details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [journeyId, tripId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!trip || !journey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-slate-600">Journey not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Button
          variant="link"
          onClick={() => router.push(`/trips/${tripId}`)}
          className="mb-4"
        >
          Back to Trip
        </Button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="text-sm text-slate-500">Journey segments</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">
            {journey.origin_name || 'Origin'} -&gt; {journey.destination_name || 'Destination'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Trip: {trip.name}
          </p>
        </div>

        <SegmentManager journeyId={journeyId} />
      </div>
    </div>
  );
}

export default function JourneySegmentsPage() {
  return (
    <ProtectedRoute>
      <JourneySegmentsContent />
    </ProtectedRoute>
  );
}
