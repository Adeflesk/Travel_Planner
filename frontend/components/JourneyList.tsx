// components/JourneyList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Journey, JourneyFormData, Destination } from '@/lib/types';
import { journeyApi, destinationApi } from '@/lib/api';
import { format } from 'date-fns';
import { Trash2, Edit2, Plane, Train, Bus, Car, Ship, Footprints, ArrowRight } from 'lucide-react';

interface JourneyListProps {
  tripId: number;
}

const transportModes = [
  { value: 'flight', label: 'Flight', icon: Plane },
  { value: 'train', label: 'Train', icon: Train },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'car', label: 'Car', icon: Car },
  { value: 'ferry', label: 'Ferry', icon: Ship },
  { value: 'walk', label: 'Walk', icon: Footprints },
];

export default function JourneyList({ tripId }: JourneyListProps) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<JourneyFormData>({
    trip_id: tripId,
    transport_mode: '',
    origin_id: undefined,
    destination_id: undefined,
    departure_datetime: '',
    arrival_datetime: '',
    carrier: '',
    booking_reference: '',
    cost: undefined,
    currency: 'USD',
    notes: '',
    status: 'planned',
  });

  const loadData = useCallback(async () => {
    try {
      const [journeysResponse, destinationsResponse] = await Promise.all([
        journeyApi.getByTripId(tripId),
        destinationApi.getByTripId(tripId),
      ]);
      setJourneys(journeysResponse.data);
      setDestinations(destinationsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await journeyApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await journeyApi.create(formData);
      }
      setFormData({
        trip_id: tripId,
        transport_mode: '',
        origin_id: undefined,
        destination_id: undefined,
        departure_datetime: '',
        arrival_datetime: '',
        carrier: '',
        booking_reference: '',
        cost: undefined,
        currency: 'USD',
        notes: '',
        status: 'planned',
      });
      loadData();
    } catch (error) {
      console.error('Error saving journey:', error);
      alert('Failed to save journey');
    }
  };

  const handleEdit = (journey: Journey) => {
    setEditingId(journey.id);
    setFormData({
      trip_id: tripId,
      transport_mode: journey.transport_mode,
      origin_id: journey.origin_id,
      destination_id: journey.destination_id,
      departure_datetime: journey.departure_datetime || '',
      arrival_datetime: journey.arrival_datetime || '',
      carrier: journey.carrier || '',
      booking_reference: journey.booking_reference || '',
      cost: journey.cost,
      currency: journey.currency || 'USD',
      notes: journey.notes || '',
      status: journey.status || 'planned',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      trip_id: tripId,
      transport_mode: '',
      origin_id: undefined,
      destination_id: undefined,
      departure_datetime: '',
      arrival_datetime: '',
      carrier: '',
      booking_reference: '',
      cost: undefined,
      currency: 'USD',
      notes: '',
      status: 'planned',
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this journey?')) {
      try {
        await journeyApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting journey:', error);
      }
    }
  };

  const getTransportIcon = (mode: string) => {
    const transport = transportModes.find((t) => t.value === mode);
    if (transport) {
      const Icon = transport.icon;
      return <Icon className="w-5 h-5" />;
    }
    return <Plane className="w-5 h-5" />;
  };

  const getDestinationName = (destId?: number) => {
    if (!destId) return 'Unknown';
    const dest = destinations.find((d) => d.id === destId);
    return dest ? dest.name : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-3">
          {editingId ? 'Edit Journey' : 'Add Journey'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Transport Mode</label>
            <select
              value={formData.transport_mode}
              onChange={(e) =>
                setFormData({ ...formData, transport_mode: e.target.value })
              }
              required
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
            >
              <option value="">Select Transport</option>
              {transportModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Carrier <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.carrier}
              onChange={(e) =>
                setFormData({ ...formData, carrier: e.target.value })
              }
              placeholder="e.g., British Airways, Eurostar"
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">From</label>
            <select
              value={formData.origin_id || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  origin_id: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
            >
              <option value="">Select Origin</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}{dest.country ? `, ${dest.country}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">To</label>
            <select
              value={formData.destination_id || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  destination_id: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
            >
              <option value="">Select Destination</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}{dest.country ? `, ${dest.country}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Departure</label>
            <input
              type="datetime-local"
              value={formData.departure_datetime}
              onChange={(e) =>
                setFormData({ ...formData, departure_datetime: e.target.value })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Arrival</label>
            <input
              type="datetime-local"
              value={formData.arrival_datetime}
              onChange={(e) =>
                setFormData({ ...formData, arrival_datetime: e.target.value })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Cost <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={formData.cost || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cost: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="0.00"
              step="0.01"
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Booking Reference <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.booking_reference}
              onChange={(e) =>
                setFormData({ ...formData, booking_reference: e.target.value })
              }
              placeholder="e.g., ABC123"
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-4 items-center">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-1.5 shadow-xs"
            >
              <option value="planned">Planned</option>
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {editingId ? 'Update Journey' : 'Add Journey'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : journeys.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">No journeys yet</p>
          <p className="text-sm text-gray-400">
            Add journeys to track your travel between destinations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((journey) => (
            <div
              key={journey.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                      {getTransportIcon(journey.transport_mode)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {getDestinationName(journey.origin_id)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold">
                        {getDestinationName(journey.destination_id)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        journey.status
                      )}`}
                    >
                      {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-2 ml-12 text-sm text-gray-600 space-y-1">
                    {journey.carrier && (
                      <p>
                        <span className="font-medium">Carrier:</span> {journey.carrier}
                      </p>
                    )}
                    {journey.departure_datetime && (
                      <p>
                        <span className="font-medium">Departs:</span>{' '}
                        {format(new Date(journey.departure_datetime), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                    {journey.arrival_datetime && (
                      <p>
                        <span className="font-medium">Arrives:</span>{' '}
                        {format(new Date(journey.arrival_datetime), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                    {journey.booking_reference && (
                      <p>
                        <span className="font-medium">Ref:</span> {journey.booking_reference}
                      </p>
                    )}
                    {journey.cost && (
                      <p>
                        <span className="font-medium">Cost:</span> ${(+journey.cost).toFixed(2)} {journey.currency}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(journey)}
                    className="text-blue-600 hover:text-blue-700 p-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(journey.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
