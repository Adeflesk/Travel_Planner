'use client';

import { useState } from 'react';
import { tripApi } from '@/lib/api';
import { TripFormData } from '@/lib/types';

const initialFormData: TripFormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  budget: undefined,
  status: 'planning',
};

export function useTripForm(onTripCreated: () => void) {
  const [formData, setFormData] = useState<TripFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tripApi.create(formData);
      setFormData(initialFormData);
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

  return {
    formData,
    loading,
    handleSubmit,
    handleChange,
  };
}
