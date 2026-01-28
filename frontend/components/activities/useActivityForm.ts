'use client';

import { useState } from 'react';
import { Activity, ActivityFormData } from '@/lib/types';
import { activityApi } from '@/lib/api';

const createInitialFormData = (destinationId: number): ActivityFormData => ({
  destination_id: destinationId,
  name: '',
  description: '',
  activity_type: '',
  scheduled_date: '',
  is_todo: false,
  is_completed: false,
});

export function useActivityForm(destinationId: number, onSuccess: () => void) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>(
    createInitialFormData(destinationId)
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData(createInitialFormData(destinationId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await activityApi.update(editingId, formData);
      } else {
        await activityApi.create(formData);
      }
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity');
    }
  };

  const startEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setFormData({
      destination_id: destinationId,
      name: activity.name,
      description: activity.description || '',
      activity_type: activity.activity_type || '',
      scheduled_date: activity.scheduled_date || '',
      is_todo: activity.is_todo,
      is_completed: activity.is_completed,
    });
  };

  const updateField = <K extends keyof ActivityFormData>(
    field: K,
    value: ActivityFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    editingId,
    isEditing: editingId !== null,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  };
}
