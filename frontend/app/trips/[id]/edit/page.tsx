// app/trips/[id]/edit/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TripFormData } from '@/lib/types';
import { tripApi } from '@/lib/api';
import { getLocalTimezone, getSupportedTimezones } from '@/lib/timezone-utils';
import { ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';

function EditTripContent() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);
  const timezones = useMemo(() => getSupportedTimezones(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TripFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    timezone: getLocalTimezone(),
    budget: undefined,
    status: 'planning',
  });

  const loadTrip = useCallback(async () => {
    try {
      const response = await tripApi.getById(tripId);
      const trip = response.data;
      setFormData({
        name: trip.name,
        description: trip.description || '',
        start_date: trip.start_date,
        end_date: trip.end_date,
        timezone: trip.timezone || getLocalTimezone(),
        budget: trip.budget,
        budget_warning_threshold: trip.budget_warning_threshold ?? 75,
        budget_danger_threshold: trip.budget_danger_threshold ?? 90,
        status: trip.status,
      });
    } catch (error) {
      console.error('Error loading trip:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTrip();
    }
  }, [loadTrip, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await tripApi.update(tripId, formData);
      alert('Trip updated successfully!');
      router.push(`/trips/${tripId}`);
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('Failed to update trip');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['budget', 'budget_warning_threshold', 'budget_danger_threshold'].includes(name)
        ? (value ? parseFloat(value) : undefined)
        : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push(`/trips/${tripId}`)}
        className="flex items-center gap-2 text-blue-600 
                 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trip
      </button>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Edit Trip
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                placeholder="e.g., Summer Europe Adventure"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
              >
                <option value="planning">Planning</option>
                <option value="booked">Booked</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget || ''}
                onChange={handleChange}
                step="0.01"
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                placeholder="e.g., 5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warning Threshold (%)
              </label>
              <input
                type="number"
                name="budget_warning_threshold"
                value={formData.budget_warning_threshold ?? 75}
                onChange={handleChange}
                min={1}
                max={99}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                placeholder="75"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danger Threshold (%)
              </label>
              <input
                type="number"
                name="budget_danger_threshold"
                value={formData.budget_danger_threshold ?? 90}
                onChange={handleChange}
                min={2}
                max={100}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
                placeholder="90"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
              />
            </div>
            <AutocompleteInput
              label="Trip Timezone"
              name="timezone"
              value={formData.timezone || ''}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              onSelect={(value) => setFormData({...formData, timezone: value})}
              suggestions={timezones}
              filterMethod="contains"
              showRecentFirst={false}
              virtualize
              placeholder="Search timezones (e.g., America/Denver)"
              hint="Used for date and time display across the trip."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400 resize-none"
              placeholder="Describe your trip..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 text-white px-6 py-3 rounded-lg 
                       font-medium hover:bg-green-700 transition 
                       disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push(`/trips/${tripId}`)}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg 
                       font-medium hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditTripPage() {
  return (
    <ProtectedRoute>
      <EditTripContent />
    </ProtectedRoute>
  );
}