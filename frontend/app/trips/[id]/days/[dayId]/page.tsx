'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { dayApi, tripApi } from '@/lib/api';
import { TripDay } from '@/lib/types';
import { DayBuilder } from '@/components/days/DayBuilder';

export default function DayPage({ params }: { params: Promise<{ id: string; dayId: string }> }) {
    const { id, dayId: dayIdStr } = use(params);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const tripId = parseInt(id, 10);
    const dayId = parseInt(dayIdStr, 10);

    const [day, setDay] = useState<TripDay | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDay = useCallback(() => {
        if (!isAuthenticated) return;
        setLoading(true);
        tripApi.getDays(tripId)
            .then(res => {
                const found = res.data.find((d: TripDay) => d.id === dayId);
                if (found) {
                    // Also fetch activities for the day
                    dayApi.getActivities(dayId)
                        .then(actRes => setDay({ ...found, activities: actRes.data }))
                        .catch(() => setDay(found));
                } else {
                    setDay(null);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isAuthenticated, tripId, dayId]);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchDay();
    }, [isAuthenticated, authLoading, fetchDay, router]);

    if (authLoading || loading) return <p className="p-8 text-center text-slate-500">Loading day...</p>;
    if (!day) return <p className="p-8 text-center text-slate-500">Day not found.</p>;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="max-w-3xl mx-auto mb-6">
                <button
                    onClick={() => router.push(`/trips/${tripId}`)}
                    className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1.5"
                >
                    <span>←</span> Back to trip
                </button>
            </div>
            <DayBuilder day={day} tripId={tripId} onRefresh={fetchDay} />
        </div>
    );
}
