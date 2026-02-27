import Link from 'next/link';
import { useState, useMemo } from 'react';
import type { TripDay } from '@/lib/types';
import { dayApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { format, addDays } from 'date-fns';
import { X } from 'lucide-react';
import { parseSafeDate } from '@/lib/datetime-utils';
import { DayForm } from './DayForm';

interface DayListProps {
    days: TripDay[];
    tripId: number;
    tripStartDate?: string;
    onRefresh: () => void;
}

export const DayList = ({ days, tripId, tripStartDate, onRefresh }: DayListProps) => {
    const [showModal, setShowModal] = useState(false);
    const [adding, setAdding] = useState(false);

    const defaultNextDate = useMemo(() => {
        const lastDayStr = days.length > 0
            ? days.reduce((latest, current) => current.date > latest ? current.date : latest, days[0].date)
            : tripStartDate || new Date().toISOString().split('T')[0];

        let nextDate: Date;
        if (days.length > 0) {
            nextDate = addDays(parseSafeDate(lastDayStr), 1);
        } else {
            nextDate = parseSafeDate(lastDayStr);
        }
        return format(nextDate, 'yyyy-MM-dd');
    }, [days, tripStartDate]);

    const handleCreateDay = async (data: { date: string; title: string; location: string; notes: string }) => {
        setAdding(true);
        try {
            await dayApi.createDay({
                trip_id: tripId,
                ...data,
                title: data.title || undefined,
                location: data.location || undefined,
                notes: data.notes || undefined
            });
            onRefresh();
            setShowModal(false);
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || err.message
                : err instanceof Error ? err.message : 'Failed to add day';
            alert(message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Itinerary</h2>
                    <p className="text-sm text-slate-500 mt-1">Plan your daily activities and reservations.</p>
                </div>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    + Add Day
                </Button>
            </div>

            {days.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-base font-semibold text-slate-700 mb-1">No days planned yet</p>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">Build your itinerary by adding days for your trip.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(day => (
                        <Link
                            key={day.id}
                            href={`/trips/${tripId}/days/${day.id}`}
                            className="group block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all text-left"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm font-semibold text-sky-600 mb-1">
                                        {format(parseSafeDate(day.date), 'EEEE, MMM d')}
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                        {day.title || day.location || 'Untitled Day'}
                                    </h3>
                                </div>
                                <div className="px-2 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-600">
                                    {day.activities?.length || 0} items
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                                {day.notes || <span className="italic text-slate-400">No notes added.</span>}
                            </p>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Day Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">Add Day</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <DayForm
                            initialData={{ date: defaultNextDate }}
                            onSubmit={handleCreateDay}
                            onCancel={() => setShowModal(false)}
                            submitLabel="Add Day"
                            isSubmitting={adding}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
