// components/DestinationList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Destination, DestinationFormData, Expense } from '@/lib/types';
import { destinationApi, expenseApi } from '@/lib/api';
import { format } from 'date-fns';
import { MapPin, Trash2, Edit2, Home, ChevronDown, ChevronRight } from 'lucide-react';
import ActivityList from './ActivityList';

interface DestinationListProps {
  tripId: number;
}

export default function DestinationList({ tripId }: DestinationListProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState<DestinationFormData>({
    trip_id: tripId,
    name: '',
    country: '',
    region: '',
    arrival_date: '',
    departure_date: '',
  });

  const loadDestinations = useCallback(async () => {
    try {
      const [destResponse, expResponse] = await Promise.all([
        destinationApi.getByTripId(tripId),
        expenseApi.getByTripId(tripId),
      ]);
      setDestinations(destResponse.data);
      setExpenses(expResponse.data);
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const getAccommodationExpenses = (dest: Destination) => {
    return expenses.filter((exp) => {
      if (exp.category !== 'accommodation') return false;

      // Manual link takes priority
      if (exp.destination_id === dest.id) return true;

      // Auto-link by date if no manual link
      // Exclude departure date since you check out that day (no accommodation needed)
      if (!exp.destination_id && dest.arrival_date && dest.departure_date) {
        const expDate = new Date(exp.date);
        const arrival = new Date(dest.arrival_date);
        const departure = new Date(dest.departure_date);
        return expDate >= arrival && expDate < departure;
      }

      return false;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await destinationApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await destinationApi.create(formData);
      }
      setFormData({
        trip_id: tripId,
        name: '',
        country: '',
        region: '',
        arrival_date: '',
        departure_date: '',
      });
      loadDestinations();
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Failed to save destination');
    }
  };

  const handleEdit = (dest: Destination) => {
    setEditingId(dest.id);
    setFormData({
      trip_id: tripId,
      name: dest.name,
      country: dest.country || '',
      region: dest.region || '',
      arrival_date: dest.arrival_date || '',
      departure_date: dest.departure_date || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      trip_id: tripId,
      name: '',
      country: '',
      arrival_date: '',
      departure_date: '',
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this destination?')) {
      try {
        await destinationApi.delete(id);
        loadDestinations();
      } catch (error) {
        console.error('Error deleting destination:', error);
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-3">
          {editingId ? 'Edit Destination' : 'Add Destination'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">City/Place</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Paris, Tokyo"
              required
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Country <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
              placeholder="e.g., France, Japan"
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Region/State <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) =>
                setFormData({ ...formData, region: e.target.value || "" })
              }
              placeholder="e.g., Île-de-France, Kanto"
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Arrival Date</label>
            <input
              type="date"
              value={formData.arrival_date}
              onChange={(e) =>
                setFormData({ ...formData, arrival_date: e.target.value })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Departure Date</label>
            <input
              type="date"
              value={formData.departure_date}
              onChange={(e) =>
                setFormData({ ...formData, departure_date: e.target.value })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                     hover:bg-blue-700"
          >
            {editingId ? 'Update Destination' : 'Add Destination'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg
                       hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : destinations.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No destinations yet</p>
      ) : (
        <div className="space-y-3">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="border border-gray-200 rounded-lg p-4 
                       hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-lg">
                      {dest.name}
                      {dest.region && `, ${dest.region}`}
                      {dest.country && `, ${dest.country}`}
                    </h4>
                  </div>
                  {dest.arrival_date && dest.departure_date && (
                    <p className="text-sm text-gray-600 mt-1 ml-7">
                      📅 {format(new Date(dest.arrival_date), 'MMM dd')} -{' '}
                      {format(new Date(dest.departure_date), 'MMM dd')}
                    </p>
                  )}
                  {getAccommodationExpenses(dest).length > 0 && (
                    <div className="mt-2 ml-7 p-2 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex items-start gap-2">
                        <Home className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="flex-1 text-xs text-blue-700">
                          {getAccommodationExpenses(dest).map((exp) => (
                            <div key={exp.id} className="flex items-center gap-1 mb-0.5">
                              <span className="font-medium">{exp.description || 'Accommodation'}</span>
                              <span>💰 ${parseFloat(exp.amount.toString()).toFixed(2)}</span>
                              {exp.booked && <span className="text-blue-600">• Booked</span>}
                              {exp.paid && <span className="text-green-600">• Paid</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(dest)}
                    className="text-blue-600 hover:text-blue-700 p-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dest.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expand/Collapse Activities Button */}
              <button
                onClick={() => setExpandedId(expandedId === dest.id ? null : dest.id)}
                className="mt-3 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {expandedId === dest.id ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {expandedId === dest.id ? 'Hide Activities' : 'Show Activities'}
              </button>

              {/* Expandable Activities Section */}
              {expandedId === dest.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ActivityList destinationId={dest.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}