'use client';

import { useEffect, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  Share2,
  MapPin,
  Route,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Wallet,
  Plane,
  Settings,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { type Trip, type Destination, type PackingSummary } from '@/lib/types';
import { destinationApi, packingApi } from '@/lib/api';
import { useTripStats } from '@/components/trips/useTripStats';
import { useBudget } from '@/components/budget';
import { useTripContext } from '@/lib/trip-context';

interface TripOverviewDashboardProps {
  trip: Trip;
  onEdit?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
}

const STATUS_CONFIG = {
  planning: {
    label: 'Planning',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.15)',
    border: 'rgba(148,163,184,0.3)',
  },
  booked: {
    label: 'Booked',
    color: '#4ECDC4',
    bg: 'rgba(78,205,196,0.15)',
    border: 'rgba(78,205,196,0.3)',
  },
  ongoing: {
    label: 'Ongoing',
    color: '#F2994A',
    bg: 'rgba(242,153,74,0.15)',
    border: 'rgba(242,153,74,0.3)',
  },
  completed: {
    label: 'Completed',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.15)',
    border: 'rgba(148,163,184,0.3)',
  },
} as const;

const BUDGET_STATUS_COLORS: Record<string, string> = {
  normal: '#4ECDC4',
  warning: '#F59E0B',
  danger: '#F97316',
  over: '#EF4444',
};

function fmtCurrency(n: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/* ─── Semicircle budget gauge ─── */
function BudgetGauge({
  percentage,
  status,
  total,
  spent,
  currency,
}: {
  percentage: number;
  status: string;
  total: number | null;
  spent: number;
  currency: string;
}) {
  // Arc: counterclockwise semicircle, center (100, 88), radius 72
  // from (28, 88) → top → (172, 88)
  const R = 72;
  const cx = 100;
  const cy = 88;
  const sw = 13;
  const halfCirc = Math.PI * R; // ≈ 226.2
  const filled = (Math.min(percentage, 100) / 100) * halfCirc;
  const color = BUDGET_STATUS_COLORS[status] ?? '#4ECDC4';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 100 }}>
        <svg
          width="200"
          height="100"
          viewBox="0 0 200 100"
          style={{ overflow: 'visible' }}
          aria-hidden="true"
        >
          {/* Track */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${cx + R} ${cy}`}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={sw}
            strokeLinecap="round"
          />
          {/* Fill — starts left, sweeps counterclockwise (up then right) */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${cx + R} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${halfCirc}`}
            style={{ transition: 'stroke-dasharray 1.2s ease-in-out' }}
          />
        </svg>

        {/* Centered label inside arc */}
        <div
          className="absolute inset-0 flex flex-col items-center"
          style={{ paddingTop: 42 }}
        >
          <span
            className="font-bold leading-none"
            style={{
              fontSize: 28,
              color,
              fontFamily: "'Playfair Display SC', Georgia, serif",
            }}
          >
            {percentage.toFixed(0)}%
          </span>
          <span className="text-xs mt-1" style={{ color: '#94A3B8' }}>
            used
          </span>
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-700 mt-1 text-center">
        {fmtCurrency(spent, currency)}
        {total != null && (
          <span className="font-normal text-slate-400"> of {fmtCurrency(total, currency)}</span>
        )}
      </p>
    </div>
  );
}

/* ─── Destination route strip ─── */
function DestinationRoute({ destinations }: { destinations: Destination[] }) {
  if (destinations.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-sm italic text-slate-400">
        No destinations added yet
      </div>
    );
  }

  return (
    <div className="flex items-start overflow-x-auto pb-2">
      {destinations.map((dest, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === destinations.length - 1;
        const bg = isFirst ? '#F2994A' : isLast ? '#4ECDC4' : '#334155';

        return (
          <div key={dest.id} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
                style={{ background: bg }}
              >
                {dest.name.slice(0, 2).toUpperCase()}
              </div>
              <p
                className="text-xs font-semibold text-slate-800 mt-2 text-center leading-tight"
                style={{ maxWidth: 72 }}
              >
                {dest.name}
              </p>
              {dest.country && (
                <p className="text-xs text-slate-400 text-center">{dest.country}</p>
              )}
              {dest.arrival_date && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {format(new Date(dest.arrival_date), 'MMM d')}
                </p>
              )}
            </div>

            {idx < destinations.length - 1 && (
              <div className="flex items-center mb-8 mx-2">
                <div className="w-5 border-t-2 border-dashed border-slate-200" />
                <Plane
                  className="w-3 h-3 text-slate-300 mx-1"
                  style={{ transform: 'rotate(90deg)' }}
                />
                <div className="w-5 border-t-2 border-dashed border-slate-200" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stat chip ─── */
function StatChip({
  value,
  label,
  iconColor,
  iconBg,
  icon: Icon,
}: {
  value: string;
  label: string;
  iconColor: string;
  iconBg: string;
  icon: LucideIcon;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: '#fff', border: '1px solid #E2E8F0' }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div>
        <p
          className="text-2xl font-bold leading-none"
          style={{
            fontFamily: "'Playfair Display SC', Georgia, serif",
            color: '#1A1A2E',
          }}
        >
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── Panel heading ─── */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-semibold"
      style={{
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#94A3B8',
      }}
    >
      {children}
    </h3>
  );
}

/* ─── Main component ─── */
export function TripOverviewDashboard({
  trip,
  onEdit,
  onShare,
  onSettings,
}: TripOverviewDashboardProps) {
  const router = useRouter();
  const { stats, loading: statsLoading } = useTripStats(trip.id);
  const { budget, loading: budgetLoading } = useBudget(trip.id);
  const tripCtx = useTripContext();
  const currency = tripCtx?.tripContext?.budget_currency || 'USD';
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packing, setPacking] = useState<PackingSummary | null>(null);

  useEffect(() => {
    destinationApi.getByTripId(trip.id).then((r) => setDestinations(r.data || []));
    packingApi
      .getSummary(trip.id)
      .then((r) => setPacking(r.data))
      .catch(() => null);
  }, [trip.id]);

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const now = new Date();
  const daysUntil = differenceInDays(startDate, now);
  const duration = Math.max(differenceInDays(endDate, startDate), 0);
  const isOngoing = daysUntil <= 0 && differenceInDays(endDate, now) >= 0;
  const isCompleted = differenceInDays(endDate, now) < 0;

  const sc = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.planning;

  let countdownValue: string;
  let countdownSub: string;
  if (isCompleted) {
    countdownValue = '✓';
    countdownSub = 'trip completed';
  } else if (isOngoing) {
    countdownValue = `D+${Math.abs(daysUntil)}`;
    countdownSub = 'days into your adventure';
  } else {
    countdownValue = String(daysUntil);
    countdownSub = 'days until departure';
  }

  const countdownFontSize = isCompleted
    ? 52
    : countdownValue.length <= 2
      ? 64
      : countdownValue.length <= 3
        ? 52
        : 40;

  return (
    <>
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');`}</style>

      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={{
            background: 'linear-gradient(135deg, #161B27 0%, #1C2640 100%)',
          }}
        >
          {/* Nav bar */}
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <button
              onClick={() => router.push('/trips')}
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              All trips
            </button>

            {trip.is_owner !== false && (
              <div className="flex items-center gap-2">
                {onShare && (
                  <button
                    onClick={onShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition hover:bg-white/10"
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition hover:opacity-90"
                    style={{ background: '#F2994A', color: '#fff' }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {onSettings && (
                  <button
                    onClick={onSettings}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition hover:bg-white/10"
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Context
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Title + countdown */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 px-6 pb-7 pt-3">
            <div className="flex-1 min-w-0">
              {/* Status pill */}
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-4"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: sc.color }}
                />
                {sc.label}
              </span>

              <h1
                className="font-bold text-white leading-tight mb-3 wrap-break-word"
                style={{
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  fontFamily: "'Playfair Display SC', Georgia, serif",
                  letterSpacing: '-0.01em',
                }}
              >
                {trip.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {format(startDate, 'MMM d')} — {format(endDate, 'MMM d, yyyy')}
                </span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  · {duration + 1} nights
                </span>
              </div>

              {trip.description && (
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.35)', maxWidth: 520 }}
                >
                  {trip.description}
                </p>
              )}
            </div>

            {/* Countdown orb */}
            <div
              className="shrink-0 flex flex-col items-center justify-center rounded-2xl px-8 py-6 text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                minWidth: 168,
              }}
            >
              <span
                className="font-bold leading-none"
                style={{
                  fontSize: countdownFontSize,
                  fontFamily: "'Playfair Display SC', Georgia, serif",
                  color: isCompleted ? 'rgba(255,255,255,0.3)' : '#F2994A',
                }}
              >
                {countdownValue}
              </span>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {countdownSub}
              </p>
            </div>
          </div>
        </div>

        {/* ── STAT STRIP ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatChip
            value={statsLoading ? '—' : String(stats?.counts.destinations ?? 0)}
            label="Destinations"
            icon={MapPin}
            iconColor="#F2994A"
            iconBg="#FEF3EB"
          />
          <StatChip
            value={
              statsLoading
                ? '—'
                : `${stats?.booked_journeys ?? 0}/${stats?.total_journeys ?? 0}`
            }
            label="Journeys booked"
            icon={Route}
            iconColor="#4ECDC4"
            iconBg="rgba(78,205,196,0.12)"
          />
          <StatChip
            value={
              statsLoading ? '—' : `${(stats?.completion_percentage ?? 0).toFixed(0)}%`
            }
            label="Completion"
            icon={CheckCircle2}
            iconColor="#22C55E"
            iconBg="#F0FDF4"
          />
          <StatChip
            value={statsLoading ? '—' : String(stats?.counts.activities ?? 0)}
            label="Activities"
            icon={TrendingUp}
            iconColor="#8B5CF6"
            iconBg="#F5F3FF"
          />
        </div>

        {/* ── MAIN GRID: route | budget ─────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] mb-4">
          {/* Route */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#fff', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center justify-between mb-4">
              <PanelLabel>Route</PanelLabel>
              <span className="text-xs text-slate-400">{destinations.length} stops</span>
            </div>
            <DestinationRoute destinations={destinations} />
          </div>

          {/* Budget */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#fff', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center justify-between mb-3">
              <PanelLabel>Budget</PanelLabel>
              {budget?.status && budget.status !== 'normal' && (
                <span
                  className="flex items-center gap-1 text-xs capitalize"
                  style={{ color: '#F97316' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {budget.status}
                </span>
              )}
            </div>

            {budgetLoading ? (
              <div className="flex items-center justify-center h-36 text-sm italic text-slate-400">
                Loading…
              </div>
            ) : budget ? (
              <>
                <BudgetGauge
                  percentage={budget.percentage_used}
                  status={budget.status}
                  total={budget.total_budget}
                  spent={budget.total_spent}
                  currency={currency}
                />
                {budget.by_category.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {budget.by_category.slice(0, 4).map((cat) => {
                      const barColor =
                        cat.percentage > 90
                          ? '#EF4444'
                          : cat.percentage > 70
                            ? '#F59E0B'
                            : '#4ECDC4';
                      return (
                        <div key={cat.category} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-20 capitalize truncate">
                            {cat.category}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(cat.percentage, 100)}%`,
                                background: barColor,
                                transition: 'width 0.8s ease',
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 w-9 text-right font-medium tabular-nums">
                            {cat.percentage.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-36 text-sm italic text-slate-400">
                No budget set
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM STRIP ───────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Packing */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#fff', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" style={{ color: '#8B5CF6' }} />
              <PanelLabel>Packing</PanelLabel>
            </div>
            {packing ? (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span
                    className="text-3xl font-bold"
                    style={{
                      fontFamily: "'Playfair Display SC', Georgia, serif",
                      color: '#1A1A2E',
                    }}
                  >
                    {packing.packed_items}
                    <span className="text-lg text-slate-400">/{packing.total_items}</span>
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: packing.progress_percent === 100 ? '#22C55E' : '#94A3B8',
                    }}
                  >
                    {packing.progress_percent}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${packing.progress_percent}%`,
                      background:
                        packing.progress_percent === 100 ? '#22C55E' : '#8B5CF6',
                      transition: 'width 0.8s ease',
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">items packed</p>
              </>
            ) : (
              <p className="text-sm italic text-slate-400">No packing list yet</p>
            )}
          </div>

          {/* Duration */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#fff', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: '#F2994A' }} />
              <PanelLabel>Duration</PanelLabel>
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: '#1A1A2E',
              }}
            >
              {duration + 1}
              <span className="text-lg text-slate-400 ml-1">nights</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {format(startDate, 'MMM d')} → {format(endDate, 'MMM d')}
            </p>
          </div>

          {/* Expenses */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#fff', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4" style={{ color: '#4ECDC4' }} />
              <PanelLabel>Expenses</PanelLabel>
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: '#1A1A2E',
              }}
            >
              {statsLoading ? '—' : (stats?.counts.expenses ?? 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">logged expenses</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default TripOverviewDashboard;
