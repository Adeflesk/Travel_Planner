'use client';

import { useState } from 'react';
import { PackingItemFormData } from '@/lib/types';
import { packingApi } from '@/lib/api';

const getInitialFormData = (tripId: number): PackingItemFormData => ({
  trip_id: tripId,
  item_name: '',
  category: '',
  quantity: 1,
});

export function usePackingForm(tripId: number, onSuccess: () => void) {
  const [formData, setFormData] = useState<PackingItemFormData>(
    getInitialFormData(tripId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await packingApi.create(formData);
      setFormData(getInitialFormData(tripId));
      onSuccess();
    } catch (error) {
      console.error('Error creating packing item:', error);
      alert('Failed to create packing item');
    }
  };

  const updateField = <K extends keyof PackingItemFormData>(
    field: K,
    value: PackingItemFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    handleSubmit,
    updateField,
  };
}
