// components/TripForm.tsx
'use client';

import { useState } from 'react';
import { tripApi } from '@/lib/api';
import { TripFormData } from '@/lib/types';

interface TripFormProps {
  onTripCreated: () => void;
}

export default function TripForm({ onTripCreated }: TripFormProps) {
  const [formData, setFormData] = useState<TripFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: undefined,
    status: 'planning',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tripApi.create(formData);
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        budget: undefined,
        status: 'planning',
      });
      onTripCreated();
      alert('Trip created successfully!');
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip');
    } finally {
      setLoading(false);
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
      [name]: name === 'budget' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  return (
    <div className="w-3/5  p-6  rounded-md  shadow-xs">
      <h2 className="text-xl font-semibold text-heading mb-6">
        Create New Trip
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-4">
          <div>
            <label className="block mb-2.5 text-sm font-medium text-heading">
              Trip Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className= "bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-3/5 px-3 py-2.5 shadow-xs placeholder:text-body" 
              placeholder="e.g., Summer Europe Adventure"
            />
          </div>

          <div>
            <label className="block mb-2.5 text-sm font-medium text-heading">
              Budget
            </label>
            <input
              type="number"
              name="budget"
              value={formData.budget || ''}
              onChange={handleChange}
              step="0.01"
              className="bg-sky-400 border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-3/5 px-3 py-2.5 shadow-xs placeholder:text-body"
              placeholder="e.g., 5000"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition"
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
              className=" px-4 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition resize-none"
            placeholder="Describe your trip..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 
                     rounded-lg font-medium hover:bg-blue-700 
                     transition-colors shadow-sm hover:shadow-md
                     disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
          {loading && (
            <span className="text-gray-500 text-sm">
              Please wait...
            </span>
          )}
        </div>
      </form>
    </div>
  );
}