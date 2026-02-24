import { TripDay, DayActivity } from '@/lib/types';
import { format } from 'date-fns';

interface ActivityBlockProps {
    activity: DayActivity;
    onClick: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    museum: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    restaurant: 'bg-rose-100 text-rose-700 border-rose-200',
    bar: 'bg-purple-100 text-purple-700 border-purple-200',
    activity: 'bg-sky-100 text-sky-700 border-sky-200',
    transport: 'bg-amber-100 text-amber-700 border-amber-200',
    accommodation: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const CATEGORY_ICONS: Record<string, string> = {
    museum: '🏛️',
    restaurant: '🍽️',
    bar: '🍸',
    activity: '🧗',
    transport: '🚆',
    accommodation: '🏨',
    other: '📌',
};

export const ActivityBlock = ({ activity, onClick }: ActivityBlockProps) => {
    const [startHour, startMin] = activity.start_time.split(':').map(Number);
    const totalStartMins = startHour * 60 + startMin;
    const dayStartMins = 7 * 60; // 7am

    let durationMins = 60; // default 1h
    if (activity.end_time) {
        const [endHour, endMin] = activity.end_time.split(':').map(Number);
        durationMins = (endHour * 60 + endMin) - totalStartMins;
    }

    // Visual layout assumptions: 7am to midnight (17 hours). We'll map each hour to a specific rem height.
    // 1 hour = 4rem (64px). 
    const topOffsetMins = Math.max(0, totalStartMins - dayStartMins);
    const topRem = (topOffsetMins / 60) * 4;
    const heightRem = (durationMins / 60) * 4;

    const colorClass = CATEGORY_COLORS[activity.category ?? 'other'] ?? CATEGORY_COLORS.other;
    const icon = CATEGORY_ICONS[activity.category ?? 'other'] ?? CATEGORY_ICONS.other;

    return (
        <div
            onClick={onClick}
            className={`absolute left-0 right-0 rounded-lg p-2.5 shadow-sm border ${colorClass} hover:opacity-90 cursor-pointer overflow-hidden group transition-all`}
            style={{
                top: `${topRem}rem`,
                height: `${heightRem}rem`,
                zIndex: 10
            }}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg leading-none mt-0.5">{icon}</span>
                    <div>
                        <h4 className="font-semibold text-sm leading-tight truncate">{activity.title}</h4>
                        <p className="text-xs opacity-80 mt-0.5 capitalize truncate">
                            {activity.category || 'Other'} • {activity.start_time}{activity.end_time ? ` - ${activity.end_time}` : ''}
                        </p>
                    </div>
                </div>
                {activity.booked && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/50 rounded flex items-center shrink-0 uppercase tracking-widest leading-none">
                        Booked
                    </span>
                )}
            </div>
            {heightRem > 3.5 && (
                <p className="text-xs mt-2 opacity-80 line-clamp-2 leading-relaxed px-1">
                    {activity.location && `📍 ${activity.location}`} {activity.notes && `· ${activity.notes}`}
                </p>
            )}
        </div>
    );
};
