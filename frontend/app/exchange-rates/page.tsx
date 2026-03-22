'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { rateHistoryApi } from '@/lib/api';
import { GlobalRateSummary } from '@/lib/types';
import { RateTable } from '@/components/exchange-rates/RateTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

const RateChart = dynamic(
  () => import('@/components/exchange-rates/RateChart').then((m) => m.RateChart),
  { ssr: false }
);

function GlobalExchangeRatesContent() {
  const [data, setData] = useState<GlobalRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await rateHistoryApi.getGlobalSummary(days);
        setData(response.data);
      } catch (err) {
        console.error('Error loading rate data:', err);
        setError('Failed to load exchange rate data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Exchange Rates</h1>
        <p className="text-slate-500 mb-6">
          Rates for all currencies used across your trips, relative to your preferred currency.
        </p>

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
                Rate Chart &mdash; Base: {data.user_base_currency}
              </h2>
              <RateChart baseCurrency={data.user_base_currency} currencies={data.currencies} />
            </Card>

            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Current Rates</h2>
              <RateTable baseCurrency={data.user_base_currency} currencies={data.currencies} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GlobalExchangeRatesPage() {
  return (
    <ProtectedRoute>
      <GlobalExchangeRatesContent />
    </ProtectedRoute>
  );
}
