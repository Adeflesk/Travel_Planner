// app/trips/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trip } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { DestinationList } from '@/components/destinations';
import ExpenseList from '@/components/ExpenseList';
import PackingList from '@/components/PackingList';

type TabType = 'destinations' | 'expenses' | 'packing';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('destinations');

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

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-yellow-100 text-yellow-800',
      booked: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || colors.planning;
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'destinations', label: 'Destinations' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'packing', label: 'Packing List' },
  ];

  return (
    <div>
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 
                   mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trips
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {trip.name}
            </h1>
            
            <div className="flex items-center gap-2 text-gray-600 mt-2">
              <Calendar className="w-4 h-4" />
              <p>
                {format(new Date(trip.start_date), 'MMM dd, yyyy')} -{' '}
                {format(new Date(trip.end_date), 'MMM dd, yyyy')}
              </p>
            </div>

            {trip.description && (
              <p className="text-gray-600 mt-3">{trip.description}</p>
            )}
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 text-sm rounded-full 
                         ${getStatusColor(trip.status)}`}
            >
              {trip.status}
            </span>

            {trip.budget && (
              <div className="flex items-center justify-end gap-1 mt-3">
                <DollarSign className="w-5 h-5 text-gray-600" />
                <p className="text-gray-700 font-semibold text-lg">
                  {parseFloat(trip.budget.toString()).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-medium border-b-2 transition 
                           ${
                             activeTab === tab.key
                               ? 'text-blue-600 border-blue-600'
                               : 'text-gray-600 border-transparent hover:text-blue-600'
                           }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'destinations' && (
          <DestinationList tripId={tripId} />
        )}
        {activeTab === 'expenses' && <ExpenseList tripId={tripId} />}
        {activeTab === 'packing' && <PackingList tripId={tripId} />}
      </div>
    </div>
  );
}