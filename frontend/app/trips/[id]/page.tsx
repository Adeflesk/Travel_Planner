// app/trips/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { MapPin, Receipt, Package, Compass, Route, Clock, Users } from 'lucide-react';
import { DestinationList } from '@/components/destinations';
import { ExpenseList } from '@/components/expenses';
import { TripActivityList } from '@/components/trip-activities';
import { JourneyList } from '@/components/journeys';
import { TripTimeline } from '@/components/timeline';
import { PackingList } from '@/components/packing';
import { DayList } from '@/components/days';
import { ShareTripModal } from '@/components/sharing';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { TripProvider } from '@/lib/trip-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TripOverviewDashboard } from '@/components/trips/TripOverviewDashboard';
import { TripSettings } from '@/components/trips/TripSettings';
import type { TripContext } from '@/lib/trip-context';

function TripDetailContent() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'destinations' | 'days' | 'journeys' | 'timeline' | 'expenses' | 'activities' | 'packing'
  >('days');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [days, setDays] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [tripRes, daysRes] = await Promise.all([
          tripApi.getById(tripId),
          tripApi.getDays(tripId).catch(() => ({ data: [] }))
        ]);
        setTrip(tripRes.data);
        setDays(daysRes.data || []);

        // Default to destinations for non-single-city trips just to preserve mostly old behavior
        if (tripRes.data?.context?.trip_type !== 'single_city') {
          setActiveTab('destinations');
        }
      } catch (error) {
        console.error('Error loading trip:', error);
        alert('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tripId, isAuthenticated]);

  const refreshDays = () => {
    tripApi.getDays(tripId).then(res => setDays(res.data || [])).catch(() => { });
  };

  const handleSaveSettings = async (context: TripContext) => {
    try {
      const response = await tripApi.update(tripId, { context });
      setTrip(response.data);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error; // Let TripSettings handle the error alert
    }
  };

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
    <TripProvider
      tripId={tripId}
      startDate={trip.start_date}
      endDate={trip.end_date}
      timezone={trip.timezone}
    >
      <div className="min-h-screen bg-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Shared-by notice */}
          {trip.is_owner === false && (
            <div className="flex items-center gap-2 mb-4 text-sm text-primary-600">
              <Badge variant="info" icon={<Users />}>
                Shared
              </Badge>
              {trip.shared_by && <span>by {trip.shared_by}</span>}
            </div>
          )}

          {/* Overview Dashboard */}
          <TripOverviewDashboard
            trip={trip}
            onEdit={
              trip.is_owner !== false
                ? () => router.push(`/trips/${tripId}/edit`)
                : undefined
            }
            onShare={
              trip.is_owner !== false ? () => setShowShareModal(true) : undefined
            }
            onSettings={
              trip.is_owner !== false ? () => setShowSettingsModal(true) : undefined
            }
          />

          {/* Tab navigation */}
          <div className="mt-6" data-testid="main-content">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                ...(trip.context?.trip_type === 'single_city'
                  ? [{ id: 'days', label: 'Days', icon: Clock }, { id: 'journeys', label: 'Journeys', icon: Route }]
                  : [{ id: 'destinations', label: 'Destinations', icon: MapPin }, { id: 'journeys', label: 'Journeys', icon: Route }, { id: 'days', label: 'Days', icon: Clock }]),
                { id: 'timeline', label: 'Timeline', icon: Clock },
                { id: 'expenses', label: 'Expenses', icon: Receipt },
                { id: 'activities', label: 'Activities', icon: Compass },
                { id: 'packing', label: 'Packing List', icon: Package },
              ].map((tab) => {
                // Ensure no dupes if we messed up arrays
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

            <Card padding="lg">
              {activeTab === 'days' && <DayList tripId={tripId} days={days} onRefresh={refreshDays} />}
              {activeTab === 'destinations' && <DestinationList tripId={tripId} />}
              {activeTab === 'journeys' && <JourneyList tripId={tripId} />}
              {activeTab === 'timeline' && <TripTimeline tripId={tripId} />}
              {activeTab === 'expenses' && <ExpenseList tripId={tripId} />}
              {activeTab === 'activities' && <TripActivityList tripId={tripId} />}
              {activeTab === 'packing' && <PackingList tripId={tripId} />}
            </Card>
          </div>

          {/* Share Modal */}
          <ShareTripModal
            tripId={tripId}
            tripName={trip.name}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
          />

          {/* Settings Modal */}
          {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-hidden flex flex-col">
                <TripSettings
                  tripId={tripId}
                  context={trip.context ?? null}
                  onSave={handleSaveSettings}
                  onClose={() => setShowSettingsModal(false)}
                />
              </div>
            </div>
          )}
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
