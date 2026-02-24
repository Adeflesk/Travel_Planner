'use client';

import { useState } from 'react';
import { TripDay, DayActivity } from '@/lib/types';
import { ActivityBlock, ActivityForm } from './';
import { format } from 'date-fns';
import { dayApi } from '@/lib/api';

interface DayBuilderProps {
    day: TripDay;
    tripId: number;
    onRefresh: () => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am to 11pm (23:00)

export const DayBuilder = ({ day, tripId, onRefresh }: DayBuilderProps) => {
    const [selectedActivity, setSelectedActivity] = useState<Partial<DayActivity> | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleOpenForm = (activity?: DayActivity) => {
        setSelectedActivity(activity || { day_id: day.id, start_time: '10:00' });
        setIsFormOpen(true);
    };

    const handleSaveActivity = async (data: Partial<DayActivity>) => {
        try {
            if (data.id) {
                await dayApi.updateActivity(data.id, data);
            } else {
                await dayApi.createActivity({ ...data, day_id: day.id } as Partial<DayActivity> & { day_id: number });
            }
            onRefresh();
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save activity:', error);
            throw error;
        }
    };

    const handleDeleteActivity = async (id: number) => {
        const ok = window.confirm('Are you sure you want to delete this activity?');
        if (!ok) return;
        try {
            await dayApi.deleteActivity(id);
            onRefresh();
            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to delete activity:', error);
        }
    };

    const activities = day.activities || [];
    const scheduled = activities.filter(a => a.start_time).sort((a, b) => a.start_time.localeCompare(b.start_time));
    const unscheduled = activities.filter(a => !a.start_time);

    return (
        <div className="max-w-3xl mx-auto pb-24">
            {/* Header */}
            <div className="bg-white px-5 py-6 rounded-2xl shadow-sm border border-slate-200 mb-8 mt-2 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {format(new Date(day.date), 'EEEE, MMMM do')}
                    </h1>
                    <p className="text-base text-slate-600 mt-1 font-medium bg-slate-100 inline-block px-2.5 py-0.5 rounded-md">
                        📍 {day.location || 'No location set'}
                    </p>
                    {day.notes && <p className="text-sm text-slate-500 mt-3 max-w-xl leading-relaxed">{day.notes}</p>}
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="bg-black hover:bg-slate-800 text-white shadow-sm font-semibold rounded-xl px-5 py-2.5 transition-colors transform active:scale-95"
                >
                    + Add Activity
                </button>
            </div>

            {/* Vertical Timeline */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
                <div className="relative border-l-2 border-slate-100 ml-8 pb-10">

                    {/* Time grid backdrop */}
                    <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
                        {HOURS.map((hour) => {
                            const displayHour = hour > 12 ? hour - 12 : hour;
                            const ampm = hour >= 12 ? 'pm' : 'am';

                            return (
                                <div key={hour} className="h-16 border-t border-slate-50 relative group">
                                    <span className="absolute -left-12 top-0 -translate-y-1/2 text-xs font-semibold text-slate-400 group-hover:text-slate-600 w-10 text-right">
                                        {displayHour}{ampm}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Render activities dynamically */}
                    <div className="relative w-full h-[68rem]"> {/* 17 hours * 4rem */}
                        {scheduled.map(activity => (
                            <ActivityBlock
                                key={activity.id}
                                activity={activity}
                                onClick={() => handleOpenForm(activity)}
                            />
                        ))}
                    </div>

                </div>

                {/* Unscheduled / Anytime block */}
                {unscheduled.length > 0 && (
                    <div className="mt-8 border-t border-dashed border-slate-200 pt-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Anytime / Unscheduled</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {unscheduled.map(activity => (
                                <div
                                    key={activity.id}
                                    onClick={() => handleOpenForm(activity)}
                                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-colors cursor-pointer group flex items-start justify-between"
                                >
                                    <div>
                                        <h4 className="font-semibold text-sm text-slate-900 group-hover:text-sky-900 line-clamp-1">{activity.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 capitalize">{activity.category || 'Other'}</p>
                                    </div>
                                    <span className="text-slate-300 group-hover:text-sky-400">•••</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal / Bottom Sheet */}
            {isFormOpen && (
                <ActivityForm
                    activity={selectedActivity || undefined}
                    dayId={day.id}
                    onSave={handleSaveActivity}
                    onClose={() => setIsFormOpen(false)}
                    onDelete={selectedActivity?.id ? handleDeleteActivity : undefined}
                />
            )}
        </div>
    );
};
