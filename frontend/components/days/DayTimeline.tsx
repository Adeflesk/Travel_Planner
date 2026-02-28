import { DayActivity, TripTransport } from '@/lib/types';
import { ActivityBlock } from './ActivityBlock';
import { TransportBlock } from './TransportBlock';

interface DayTimelineProps {
    scheduled: DayActivity[];
    unscheduled: DayActivity[];
    onEditActivity: (activity: DayActivity) => void;
    transportItems?: TripTransport[];
    currentDayId?: number;
    onEditTransport?: (t: TripTransport) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am to 11pm (23:00)

export const DayTimeline = ({
    scheduled,
    unscheduled,
    onEditActivity,
    transportItems = [],
    currentDayId,
    onEditTransport,
}: DayTimelineProps) => {
    return (
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

                {/* Render activities and transport dynamically */}
                <div className="relative w-full h-272"> {/* 17 hours * 4rem */}
                    {scheduled.map(activity => (
                        <ActivityBlock
                            key={activity.id}
                            activity={activity}
                            onClick={() => onEditActivity(activity)}
                        />
                    ))}
                    {currentDayId != null && transportItems.map(t => {
                        const time = t.departure_day_id === currentDayId ? t.departure_time : t.arrival_time;
                        if (!time) return null;
                        return (
                            <TransportBlock
                                key={`transport-${t.id}`}
                                transport={t}
                                currentDayId={currentDayId}
                                onClick={() => onEditTransport?.(t)}
                            />
                        );
                    })}
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
                                onClick={() => onEditActivity(activity)}
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

            {/* Unscheduled transport (no departure time) */}
            {currentDayId != null && transportItems.some(t => t.departure_day_id === currentDayId && !t.departure_time) && (
                <div className="mt-6 border-t border-dashed border-sky-100 pt-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Transport — no time set</h3>
                    <div className="space-y-2">
                        {transportItems
                            .filter(t => t.departure_day_id === currentDayId && !t.departure_time)
                            .map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => onEditTransport?.(t)}
                                    className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-800 cursor-pointer hover:bg-sky-100 transition-colors flex items-center gap-2"
                                >
                                    <span className="text-base">✈</span>
                                    <span className="text-sm font-medium">{t.origin} → {t.destination}</span>
                                    {t.carrier && <span className="text-xs text-sky-500">{t.carrier}</span>}
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};
