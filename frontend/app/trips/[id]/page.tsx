// app/trips/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { ArrowLeft, Calendar, DollarSign, Edit, MapPin, Receipt, Package, Compass, Route, Clock, Share2, Users } from 'lucide-react';
import { DestinationList } from '@/components/destinations';
import { ExpenseList } from '@/components/expenses';
import { TripActivityList } from '@/components/trip-activities';
import { JourneyList } from '@/components/journeys';
import { TripTimeline } from '@/components/timeline';
import { PackingList } from '@/components/packing';
import { ShareTripModal } from '@/components/sharing';
import { BudgetProgress, useBudget } from '@/components/budget';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import TripSidebar from '@/components/trips/TripSidebar';
import { TripProvider } from '@/lib/trip-context';

function TripDetailContent() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'destinations' | 'journeys' | 'timeline' | 'expenses' | 'activities' | 'packing'>('destinations');
  const [showShareModal, setShowShareModal] = useState(false);
  const { budget, loading: budgetLoading } = useBudget(tripId);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadTrip = async () => {
      try {
        const response = await tripApi.getById(tripId);
        setTrip(response.data);
      } catch (error) {
        console.error('Error loading trip:', error);
        alert('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [tripId, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100">
        <div className="text-xl text-slate-600">Trip not found</div>
      </div>
    );
  }

  return (
    <TripProvider tripId={tripId} startDate={trip.start_date} endDate={trip.end_date}>
      <div className="min-h-screen bg-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
      <Button
        variant="link"
        onClick={() => router.push('/trips')}
        leftIcon={<ArrowLeft />}
        className="mb-6"
      >
        Back to Trips
      </Button>

      {/* Trip Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {trip.name}
              </h1>
              {trip.is_owner === false && (
                <Badge variant="info" icon={<Users />}>
                  Shared
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={trip.status as 'planning' | 'booked' | 'ongoing' | 'completed'} />
              {trip.shared_by && (
                <span className="text-sm text-primary-600">
                  Shared by {trip.shared_by}
                </span>
              )}
            </div>

            {trip.description && (
              <p className="text-slate-600">{trip.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Calendar className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm text-slate-500">Start Date</p>
                  <p className="font-medium">{trip.start_date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <Calendar className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm text-slate-500">End Date</p>
                  <p className="font-medium">{trip.end_date}</p>
                </div>
              </div>

              {trip.budget && (
                <div className="flex items-center gap-3 text-slate-700">
                  <DollarSign className="w-5 h-5 text-success-600" />
                  <div>
                    <p className="text-sm text-slate-500">Budget</p>
                    <p className="font-medium">${trip.budget.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:max-w-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">Budget Progress</p>
              {budgetLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-2 bg-slate-200 rounded"></div>
                  <div className="h-2 bg-slate-200 rounded w-2/3"></div>
                </div>
              ) : budget ? (
                <BudgetProgress
                  totalBudget={budget.total_budget}
                  totalSpent={budget.total_spent}
                  percentageUsed={budget.percentage_used}
                  remaining={budget.remaining}
                  status={budget.status}
                  bookedAmount={budget.booked_amount}
                  estimatedAmount={budget.estimated_amount}
                  showDetails={true}
                />
              ) : (
                <p className="text-sm text-slate-500">No budget data available.</p>
              )}
            </div>
          </div>
        </div>

        {trip.is_owner !== false && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowShareModal(true)}
              leftIcon={<Share2 />}
            >
              Share
            </Button>
            <Button
              onClick={() => router.push(`/trips/${tripId}/edit`)}
              leftIcon={<Edit />}
            >
              Edit Trip
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div data-testid="main-content">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: 'destinations', label: 'Destinations', icon: MapPin },
              { id: 'journeys', label: 'Journeys', icon: Route },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'expenses', label: 'Expenses', icon: Receipt },
              { id: 'activities', label: 'Activities', icon: Compass },
              { id: 'packing', label: 'Packing List', icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  leftIcon={<Icon />}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Tab Content */}
          <Card padding="lg">
            {activeTab === 'destinations' && <DestinationList tripId={tripId} />}
            {activeTab === 'journeys' && <JourneyList tripId={tripId} />}
            {activeTab === 'timeline' && <TripTimeline tripId={tripId} />}
            {activeTab === 'expenses' && <ExpenseList tripId={tripId} />}
            {activeTab === 'activities' && <TripActivityList tripId={tripId} />}
            {activeTab === 'packing' && <PackingList tripId={tripId} />}
          </Card>
        </div>

        <TripSidebar tripId={tripId} trip={trip} />
      </div>

      {/* Share Modal */}
      <ShareTripModal
        tripId={tripId}
        tripName={trip.name}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      </div>
      </div>
    </TripProvider>
  );
}

export default function TripDetailPage() {
  return (
    <ProtectedRoute>
      <TripDetailContent />
    </ProtectedRoute>
  );
}
