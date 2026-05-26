'use client';

import { useState, useEffect, useCallback } from 'react';
import { PreTripTask, PreTripTaskCreate, PreTripTaskUpdate, PreTripTaskStatus } from '@/lib/types';
import { preTripApi } from '@/lib/api';

export function usePreTripTasks(tripId: number) {
    const [tasks, setTasks] = useState<PreTripTask[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        try {
            const res = await preTripApi.list(tripId);
            setTasks(res.data);
        } catch (e) {
            console.error('Failed to load pre-trip tasks', e);
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    useEffect(() => { reload(); }, [reload]);

    const createTask = async (data: PreTripTaskCreate) => {
        const res = await preTripApi.create(tripId, data);
        setTasks(prev => [...prev, res.data]);
        return res.data;
    };

    const updateTask = async (taskId: number, data: PreTripTaskUpdate) => {
        const res = await preTripApi.update(taskId, data);
        setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
        return res.data;
    };

    const cycleStatus = async (task: PreTripTask) => {
        const cycle: Record<PreTripTaskStatus, PreTripTaskStatus> = {
            pending: 'booked',
            booked: 'paid',
            paid: 'pending',
        };
        await updateTask(task.id, { status: cycle[task.status] });
    };

    const deleteTask = async (taskId: number) => {
        await preTripApi.remove(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    return { tasks, loading, createTask, updateTask, cycleStatus, deleteTask, reload };
}
