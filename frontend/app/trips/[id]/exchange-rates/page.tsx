'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { rateHistoryApi } from '@/lib/api';
import { TripRateSummary } from '@/lib/types';
import { RateTable } from '@/components/exchange-rates/RateTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

const RateChart = dynamic(
  () => import('@/components/exchange-rates/RateChart').then((m) => m.RateChart),
  { ssr: false }
);

function TripExchangeRatesContent() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [data, setData] = useState<TripRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await rateHistoryApi.getTripSummary(tripId, days);
        setData(response.data);
      } catch (err) {
        console.error('Error loading rate data:', err);
        setError('Failed to load exchange rate data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId, days]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/trips/${tripId}`)}
            leftIcon={<ArrowLeft />}
          >
            Back to Trip
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Exchange Rates</h1>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2 mb-6">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-500">Loading exchange rates...</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-500">{error}</div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">
                Rate Chart &mdash; Base: {data.trip_base_currency}
              </h2>
              <RateChart baseCurrency={data.trip_base_currency} currencies={data.currencies} />
            </Card>

            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Current Rates</h2>
              <RateTable baseCurrency={data.trip_base_currency} currencies={data.currencies} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripExchangeRatesPage() {
  return (
    <ProtectedRoute>
      <TripExchangeRatesContent />
    </ProtectedRoute>
  );
}
