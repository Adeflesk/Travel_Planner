import { format } from 'date-fns';
import { Settings2, Plus, Plane } from 'lucide-react';
import { TripDay } from '@/lib/types';
import { parseSafeDate } from '@/lib/datetime-utils';

interface DayHeaderProps {
    day: TripDay;
    onEditDay: () => void;
    onAddActivity: () => void;
    onAddTransport?: () => void;
}

export const DayHeader = ({ day, onEditDay, onAddActivity, onAddTransport }: DayHeaderProps) => {
    const parsedDate = parseSafeDate(day.date);
    const dayName = format(parsedDate, 'EEEE');
    const monthYear = format(parsedDate, 'MMMM yyyy');

    return (
        <div className="mb-8 mt-2">
            <div className="flex items-start justify-between gap-4">
                {/* Left: date badge + info */}
                <div className="flex items-start gap-4">
                    {/* Dark editorial date badge */}
                    <div className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-xl px-3 pt-3 pb-2 min-w-[52px] shrink-0">
                        <span
                            className="text-3xl font-bold leading-none"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {format(parsedDate, 'd')}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1 leading-none">
                            {format(parsedDate, 'MMM')}
                        </span>
                    </div>

                    {/* Day info */}
                    <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                            <h1
                                className="text-2xl font-bold text-slate-900 leading-tight tracking-tight"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {dayName}
                            </h1>
                            <button
                                onClick={onEditDay}
                                className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit day details"
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>
                        </div>
                        {day.title && (
                            <h2
                                className="text-base font-semibold text-slate-600 mt-0.5 italic"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {day.title}
                            </h2>
                        )}
                        <p className="text-sm text-slate-400 mt-0.5 font-medium">{monthYear}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                📍 {day.location || 'No location set'}
                            </span>
                        </div>
                        {day.notes && (
                            <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                                {day.notes}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {onAddTransport && (
                        <button
                            onClick={onAddTransport}
                            className="inline-flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-medium rounded-xl px-4 py-2.5 transition-colors"
                        >
                            <Plane className="w-3.5 h-3.5" />
                            Transport
                        </button>
                    )}
                    <button
                        onClick={onAddActivity}
                        className="inline-flex items-center gap-1.5 text-sm bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-5 py-2.5 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Activity
                    </button>
                </div>
            </div>
            <div className="h-px bg-slate-100 mt-6" />
        </div>
    );
};
