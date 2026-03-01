// app/trips/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trip, TripDay } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode-utils';
import { MapPin, Receipt, Package, Compass, Clock, Users, Calendar } from 'lucide-react';
import { DestinationList } from '@/components/destinations';
import { ExpenseList } from '@/components/expenses';
import { TripActivityList } from '@/components/trip-activities';
import { TripTimeline } from '@/components/timeline';
import { PackingList } from '@/components/packing';
import { DayList } from '@/components/days';
import { ShareTripModal } from '@/components/sharing';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { TripProvider, TripContext } from '@/lib/trip-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TripOverviewDashboard } from '@/components/trips/TripOverviewDashboard';
import { TripSettings } from '@/components/trips/TripSettings';

function TripDetailContent() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'days' | 'destinations' | 'timeline' | 'expenses' | 'activities' | 'packing'
  >('days');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState<TripDay[]>([]);
  const [defaultTabSet, setDefaultTabSet] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadTrip = async () => {
      try {
        const response = await tripApi.getById(tripId);
        setTrip(response.data);

        // Set default tab based on trip type once
        if (!defaultTabSet) {
          if (response.data.context?.trip_type === 'single_city') {
            setActiveTab('days');
          } else {
            setActiveTab('destinations');
          }
          setDefaultTabSet(true);
        }
      } catch (error) {
        console.error('Error loading trip:', error);
        alert('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    const loadDays = async () => {
      try {
        const response = await tripApi.getDays(tripId);
        setDays(response.data);
      } catch (error) {
        console.error('Error loading days:', error);
      }
    };

    loadTrip();
    loadDays();
  }, [tripId, isAuthenticated, defaultTabSet]);

  const handleRefreshDays = async () => {
    try {
      const response = await tripApi.getDays(tripId);
      setDays(response.data);
    } catch (error) {
      console.error('Error refreshing days:', error);
    }
  };

  const handleSaveSettings = async (context: TripContext, defaultCurrency: string) => {
    try {
      await tripApi.update(tripId, { context, default_currency: defaultCurrency });
      // Reload trip to get updated context
      const response = await tripApi.getById(tripId);
      setTrip(response.data);

      if (context.home_base && context.home_base !== trip?.context?.home_base) {
        geocodeAddress(context.home_base).then(coords => {
          if (coords) {
            tripApi.update(tripId, {
              context: {
                ...context,
                home_base_latitude: coords.lat,
                home_base_longitude: coords.lng
              }
            }).catch(console.error);
          }
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
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
      tripContext={trip.context} // Trip preferences (pacing, etc.)
      defaultCurrency={trip.default_currency}
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
              trip.is_owner !== false ? () => setShowSettings(true) : undefined
            }
          />

          {/* Tab navigation */}
          <div className="mt-6" data-testid="main-content">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: 'days', label: 'Itinerary', icon: Calendar },
                { id: 'destinations', label: 'Destinations', icon: MapPin },
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

            <Card padding="lg">
              {activeTab === 'days' && (
                <DayList
                  days={days}
                  tripId={tripId}
                  tripStartDate={trip.start_date}
                  onRefresh={handleRefreshDays}
                />
              )}
              {activeTab === 'destinations' && <DestinationList tripId={tripId} />}
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

          {/* Settings / Context Modal */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
                <TripSettings
                  tripId={tripId}
                  context={trip.context ?? null}
                  defaultCurrency={trip.default_currency}
                  onSave={handleSaveSettings}
                  onClose={() => setShowSettings(false)}
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
