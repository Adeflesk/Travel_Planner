// app/trips/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { ArrowLeft, Calendar, DollarSign, Edit, MapPin, Receipt, Package, Compass, Route, Clock } from 'lucide-react';
import { DestinationList } from '@/components/destinations';
import ExpenseList from '@/components/ExpenseList';
import TripActivityList from '@/components/TripActivityList';
import JourneyList from '@/components/JourneyList';
import TripTimeline from '@/components/TripTimeline';
import PackingList from '@/components/PackingList';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'destinations' | 'journeys' | 'timeline' | 'expenses' | 'activities' | 'packing'>('destinations');

  useEffect(() => {
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
  }, [tripId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-blue-100 text-blue-800',
      booked: 'bg-green-100 text-green-800',
      ongoing: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Trip not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flesk items-center justify-center  bg-gray-100 p-8">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trips
      </button>

      {/* Trip Header */}
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="w-full px-4 py-2 border
                                       border-gray-300 rounded-md
                                       focus:outline-none focus:ring-2
                                       focus:ring-indigo-500">
              {trip.name}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                trip.status
              )}`}
            >
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </span>
          </div>
          <button
            onClick={() => router.push(`/trips/${tripId}/edit`)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Edit Trip
          </button>
        </div>

        {trip.description && (
          <p className="text-gray-600 mb-4">{trip.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">{trip.start_date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{trip.end_date}</p>
            </div>
          </div>

          {trip.budget && (
            <div className="flex items-center gap-3 text-gray-700">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="font-medium">${trip.budget.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('destinations')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'destinations'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Destinations
          </div>
        </button>
        <button
          onClick={() => setActiveTab('journeys')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'journeys'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Journeys
          </div>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'timeline'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline
          </div>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Expenses
          </div>
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'activities'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Activities
          </div>
        </button>
        <button
          onClick={() => setActiveTab('packing')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'packing'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Packing List
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'destinations' && <DestinationList tripId={tripId} />}
        {activeTab === 'journeys' && <JourneyList tripId={tripId} />}
        {activeTab === 'timeline' && <TripTimeline tripId={tripId} />}
        {activeTab === 'expenses' && <ExpenseList tripId={tripId} />}
        {activeTab === 'activities' && <TripActivityList tripId={tripId} />}
        {activeTab === 'packing' && <PackingList tripId={tripId} />}
      </div>
    </div>
  );
}
