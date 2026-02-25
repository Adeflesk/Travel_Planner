'use client';

import { useState } from 'react';
import { tripApi } from '@/lib/api';
import { TripFormData } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';

const initialFormData: TripFormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  timezone: getLocalTimezone(),
  budget: undefined,
  budget_warning_threshold: 75,
  budget_danger_threshold: 90,
  status: 'planning',
};

export function useTripForm(onTripCreated: () => void) {
  const [formData, setFormData] = useState<TripFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const updateField = <K extends keyof TripFormData>(
    field: K,
    value: TripFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      alert('Please enter a trip name');
      return;
    }
    if (!formData.start_date) {
      alert('Please select a start date');
      return;
    }
    if (!formData.end_date) {
      alert('Please select an end date');
      return;
    }

    // Validate date order
    if (formData.end_date < formData.start_date) {
      alert('End date must be on or after start date');
      return;
    }

    setLoading(true);

    // Clean the data - remove empty optional fields
    const cleanedData: Partial<TripFormData> = {
      name: formData.name.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: formData.status || 'planning',
    };
    if (formData.description?.trim()) {
      cleanedData.description = formData.description.trim();
    }
    if (formData.budget !== undefined && formData.budget !== null) {
      cleanedData.budget = formData.budget;
    }
    if (formData.budget_warning_threshold != null) {
      cleanedData.budget_warning_threshold = formData.budget_warning_threshold;
    }
    if (formData.budget_danger_threshold != null) {
      cleanedData.budget_danger_threshold = formData.budget_danger_threshold;
    }
    if (formData.timezone?.trim()) {
      cleanedData.timezone = formData.timezone.trim();
    }

    try {
      await tripApi.create(cleanedData as TripFormData);
      setFormData(initialFormData);
      onTripCreated();
      alert('Trip created successfully!');
    } catch (error: unknown) {
      console.error('Error creating trip:', error);
      console.error('Submitted data:', cleanedData);
      // Log detailed error info for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        console.error('Response data:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      alert('Failed to create trip. Check browser console for details.');
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
    updateField(
      name as keyof TripFormData,
      (['budget', 'budget_warning_threshold', 'budget_danger_threshold'].includes(name)
        ? (value ? parseFloat(value) : undefined)
        : value) as TripFormData[keyof TripFormData]
    );
  };

  return {
    formData,
    loading,
    handleSubmit,
    handleChange,
    updateField,
  };
}
