'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { CurrencyRateSummary } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Distinct colors for up to 10 currency lines
const LINE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

interface RateChartProps {
  baseCurrency: string;
  currencies: CurrencyRateSummary[];
}

export function RateChart({ baseCurrency, currencies }: RateChartProps) {
  const chartData = useMemo(() => {
    // Only include currencies that have history
    const withHistory = currencies.filter((c) => c.history.length > 0);

    if (withHistory.length === 0) return null;

    // Collect all unique timestamps across all currencies, sorted
    const allTimestamps = [
      ...new Set(
        withHistory.flatMap((c) =>
          c.history.map((p) => p.fetched_at)
        )
      ),
    ].sort();

    // Format labels as short dates
    const labels = allTimestamps.map((t) =>
      new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    );

    const datasets = withHistory.map((c, i) => {
      // Map this currency's history into the shared timeline
      const rateMap = new Map(c.history.map((p) => [p.fetched_at, p.rate]));
      const data = allTimestamps.map((t) => rateMap.get(t) ?? null);

      return {
        label: c.target_currency,
        data,
        borderColor: LINE_COLORS[i % LINE_COLORS.length],
        backgroundColor: LINE_COLORS[i % LINE_COLORS.length] + '1a',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        spanGaps: true,
      };
    });

    return { labels, datasets };
  }, [currencies]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-slate-500">
        No historical data yet. Rates will be recorded as you use the app.
      </div>
    );
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Exchange Rates (1 ${baseCurrency} = ?)`,
        font: { size: 14 },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        title: { display: true, text: 'Rate' },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  );
}
