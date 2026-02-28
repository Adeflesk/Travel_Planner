'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { dayApi, tripApi } from '@/lib/api';
import { Trip, TripDay } from '@/lib/types';
import { DayBuilder } from '@/components/days/DayBuilder';
import { TripProvider } from '@/lib/trip-context';

export default function DayPage({ params }: { params: Promise<{ id: string; dayId: string }> }) {
    const { id, dayId: dayIdStr } = use(params);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const tripId = parseInt(id, 10);
    const dayId = parseInt(dayIdStr, 10);

    const [trip, setTrip] = useState<Trip | null>(null);
    const [day, setDay] = useState<TripDay | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDay = useCallback(async (showLoading = false) => {
        if (!isAuthenticated) return;
        if (showLoading) setLoading(true);

        try {
            const res = await tripApi.getDays(tripId);
            const found = res.data.find((d: TripDay) => d.id === dayId);
            if (found) {
                try {
                    const actRes = await dayApi.getActivities(dayId);
                    setDay({ ...found, activities: actRes.data });
                } catch {
                    setDay(found);
                }
            } else {
                setDay(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [isAuthenticated, tripId, dayId]);

    const handleRefresh = useCallback(() => fetchDay(true), [fetchDay]);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const load = async () => {
            try {
                const [tripRes] = await Promise.all([
                    tripApi.getById(tripId),
                ]);
                setTrip(tripRes.data);
            } catch (error) {
                console.error('Error loading trip:', error);
            }
            await fetchDay(false);
            setLoading(false);
        };
        load();
    }, [isAuthenticated, authLoading, fetchDay, router, tripId]);

    if (authLoading || loading) return <p className="p-8 text-center text-slate-500">Loading day...</p>;
    if (!day) return <p className="p-8 text-center text-slate-500">Day not found.</p>;

    return (
        <TripProvider
            tripId={tripId}
            startDate={trip?.start_date}
            endDate={trip?.end_date}
            timezone={trip?.timezone}
            tripContext={trip?.context}
            defaultCurrency={trip?.default_currency}
        >
            <div className="min-h-screen bg-slate-50 px-4 py-8">
                <div className="max-w-3xl mx-auto mb-6">
                    <button
                        onClick={() => router.push(`/trips/${tripId}`)}
                        className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1.5"
                    >
                        <span>←</span> Back to trip
                    </button>
                </div>
                <DayBuilder day={day} tripId={tripId} onRefresh={handleRefresh} />
            </div>
        </TripProvider>
    );
}
