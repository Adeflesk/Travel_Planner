// app/trips/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Trip } from '@/lib/types';
import type { TripContext } from '@/lib/trip-context';
import { tripApi, destinationApi } from '@/lib/api';
import type { Coordinates } from '@/lib/geocode-utils';
import { autoCreateDaysForDestination } from '@/lib/destination-day-utils';
import { TripCard, TripWizard } from '@/components/trips';
import { Plus, X } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function TripsContent() {
  const { isAuthenticated } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadTrips();
    }
  }, [isAuthenticated]);

  const loadTrips = async () => {
    try {
      const response = await tripApi.getAll();
      setTrips(response.data);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (data: {
    name: string;
    description?: string;
    timezone?: string;
    start_date: string;
    end_date: string;
    budget?: number;
    default_currency?: string;
    first_destination?: string;
    home_base_coords?: Coordinates;
    first_destination_coords?: Coordinates;
    context: TripContext;
  }) => {
    setCreating(true);
    try {
      const response = await tripApi.create(data);
      const tripId = response.data?.id;
      alert('Trip created successfully!');
      loadTrips();
      setShowForm(false);

      if (tripId && data.home_base_coords) {
        tripApi.update(tripId, {
          context: {
            ...data.context,
            home_base_latitude: data.home_base_coords.lat,
            home_base_longitude: data.home_base_coords.lng,
          }
        }).catch(console.error);
      }

      if (tripId && data.first_destination) {
        destinationApi.create({
          trip_id: tripId,
          name: data.first_destination,
          timezone: data.timezone,
          arrival_date: data.start_date,
          departure_date: data.end_date,
        }).then(destRes => {
          const dest = destRes.data;

          if (data.first_destination_coords) {
            destinationApi.update(dest.id, {
              latitude: data.first_destination_coords.lat,
              longitude: data.first_destination_coords.lng,
            }).catch(console.error);
          }

          // Create days for the destination
          if (dest.arrival_date && dest.departure_date) {
            autoCreateDaysForDestination({
              tripId,
              destinationId: dest.id,
              destinationName: dest.name,
              arrivalDate: dest.arrival_date,
              departureDate: dest.departure_date,
            }).catch(console.error);
          }
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  const handleTripDeleted = () => {
    loadTrips();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100">
        <div className="text-xl text-slate-600">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <Card padding="lg" className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Your Trips
          </h2>
          <Button
            onClick={() => setShowForm(!showForm)}
            leftIcon={showForm ? <X /> : <Plus />}
            variant={showForm ? 'secondary' : 'primary'}
          >
            {showForm ? 'Cancel' : 'New Trip'}
          </Button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <TripWizard
              onSubmit={handleCreateTrip}
              onCancel={() => setShowForm(false)}
              loading={creating}
            />
          </div>
        )}

        {trips.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No trips yet. Create your first trip by clicking the New Trip button above!
          </p>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onDelete={handleTripDeleted}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function TripsPage() {
  return (
    <ProtectedRoute>
      <TripsContent />
    </ProtectedRoute>
  );
}
