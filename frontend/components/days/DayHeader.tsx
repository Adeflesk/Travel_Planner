import { format } from 'date-fns';
import { Settings2 } from 'lucide-react';
import { TripDay } from '@/lib/types';
import { parseSafeDate } from '@/lib/datetime-utils';

interface DayHeaderProps {
    day: TripDay;
    onEditDay: () => void;
    onAddActivity: () => void;
}

export const DayHeader = ({ day, onEditDay, onAddActivity }: DayHeaderProps) => {
    return (
        <div className="bg-white px-5 py-6 rounded-2xl shadow-sm border border-slate-200 mb-8 mt-2 flex items-start justify-between">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {format(parseSafeDate(day.date), 'EEEE, MMMM do')}
                    </h1>
                    <button
                        onClick={onEditDay}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        title="Edit day details"
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>
                {day.title && <h2 className="text-lg font-bold text-slate-700 mt-1">{day.title}</h2>}
                <p className="text-base text-slate-600 mt-2 font-medium bg-slate-100 inline-block px-2.5 py-0.5 rounded-md">
                    📍 {day.location || 'No location set'}
                </p>
                {day.notes && <p className="text-sm text-slate-500 mt-3 max-w-xl leading-relaxed">{day.notes}</p>}
            </div>
            <button
                onClick={onAddActivity}
                className="bg-black hover:bg-slate-800 text-white shadow-sm font-semibold rounded-xl px-5 py-2.5 transition-colors transform active:scale-95"
            >
                + Add Activity
            </button>
        </div>
    );
};
