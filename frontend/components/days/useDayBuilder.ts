import { useState } from 'react';
import { dayApi } from '@/lib/api';
import { DayActivity, DayActivityCreate, TripDay } from '@/lib/types';

export const useDayBuilder = (day: TripDay, onRefresh: () => void) => {
    const [selectedActivity, setSelectedActivity] = useState<Partial<DayActivity> | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showEditDayModal, setShowEditDayModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveActivity = async (data: Partial<DayActivity>) => {
        setIsSubmitting(true);
        try {
            if (data.id) {
                await dayApi.updateActivity(data.id, data);
            } else {
                await dayApi.createActivity({
                    ...data,
                    day_id: day.id,
                    destination_id: day.destination_id ?? undefined,
                    title: data.title ?? '',
                } as DayActivityCreate);
            }
            onRefresh();
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save activity:', error);
            alert('Failed to save activity');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteActivity = async (id: number) => {
        if (!confirm('Are you sure you want to delete this activity?')) return;
        try {
            await dayApi.deleteActivity(id);
            onRefresh();
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to delete activity:', error);
            alert('Failed to delete activity');
        }
    };

    const handleUpdateDay = async (data: { date: string; title: string; location: string; notes: string }) => {
        setIsSubmitting(true);
        try {
            await dayApi.updateDay(day.id, data);
            onRefresh();
            setShowEditDayModal(false);
        } catch (error) {
            console.error('Failed to update day:', error);
            alert('Failed to update day');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDay = async () => {
        if (!confirm('Are you sure you want to delete this entire day? All activities will be removed.')) return;
        try {
            await dayApi.deleteDay(day.id);
            // Redirect will be handled by the parent or router if needed, 
            // but here we just refresh to let the parent handle the absence of the day.
            onRefresh();
        } catch (error) {
            console.error('Failed to delete day:', error);
            alert('Failed to delete day');
        }
    };

    const openCreateForm = () => {
        setSelectedActivity(null);
        setIsFormOpen(true);
    };

    const openEditForm = (activity: DayActivity) => {
        setSelectedActivity(activity);
        setIsFormOpen(true);
    };

    return {
        selectedActivity,
        isFormOpen,
        setIsFormOpen,
        showEditDayModal,
        setShowEditDayModal,
        isSubmitting,
        handleSaveActivity,
        handleDeleteActivity,
        handleUpdateDay,
        handleDeleteDay,
        openCreateForm,
        openEditForm
    };
};
