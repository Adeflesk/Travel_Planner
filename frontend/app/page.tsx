// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import TripCard from '@/components/TripCard';
import TripForm from '@/components/TripForm';
import { Plus } from 'lucide-react';

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

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

  const handleTripCreated = () => {
    loadTrips();
    setShowForm(false);
  };

  const handleTripDeleted = () => {
    loadTrips();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading trips...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-12  ">
        <div className="flex justify-between items-center mb-4 ">
          <h2 className="text-2xl font-bold text-gray-800 ">
            Your Trips
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2
                     rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'New Trip'}
          </button>
        </div>

        {showForm && (
          <div className=" flex items-center
                        justify-center bg-gray-100">
            <TripForm
              onTripCreated={handleTripCreated}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {trips.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
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
      </div>
    </div>
  );
}