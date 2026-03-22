import { DayActivity } from '@/lib/types';

interface ActivityBlockProps {
    activity: DayActivity;
    onClick: () => void;
    highlighted?: boolean;
}

// Left border hex color per category
const CATEGORY_BORDER_HEX: Record<string, string> = {
    museum: '#6366F1',        // indigo-500
    restaurant: '#F43F5E',    // rose-500
    bar: '#A855F7',           // purple-500
    sightseeing: '#F97316',   // orange-500
    visiting: '#EC4899',      // pink-500
    activity: '#0EA5E9',      // sky-500
    transport: '#F59E0B',     // amber-500
    accommodation: '#10B981', // emerald-500
    other: '#94A3B8',         // slate-400
};

const CATEGORY_ICONS: Record<string, string> = {
    museum: '🏛️',
    restaurant: '🍽️',
    bar: '🍸',
    sightseeing: '👀',
    visiting: '🏡',
    activity: '🧗',
    transport: '🚆',
    accommodation: '🏨',
    other: '📌',
};

export const ActivityBlock = ({ activity, onClick, highlighted }: ActivityBlockProps) => {
    const [startHour, startMin] = (activity.start_time ?? '00:00').split(':').map(Number);
    const totalStartMins = startHour * 60 + startMin;
    const dayStartMins = 7 * 60; // 7am

    let durationMins = 60; // default 1h
    if (activity.end_time) {
        const [endHour, endMin] = activity.end_time.split(':').map(Number);
        durationMins = (endHour * 60 + endMin) - totalStartMins;
    }

    // 1 hour = 4rem (64px)
    const topOffsetMins = Math.max(0, totalStartMins - dayStartMins);
    const topRem = (topOffsetMins / 60) * 4;
    const heightRem = (durationMins / 60) * 4;

    const cat = activity.category ?? 'other';
    const borderHex = CATEGORY_BORDER_HEX[cat] ?? CATEGORY_BORDER_HEX.other;
    const icon = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS.other;

    return (
        <div
            onClick={onClick}
            className={`absolute left-0 right-0 bg-white rounded-r-lg shadow-sm border cursor-pointer overflow-hidden group transition-all hover:shadow-md hover:border-slate-200 ${highlighted ? 'ring-2 ring-red-500 ring-offset-1 border-red-200 shadow-md' : 'border-slate-100'}`}
            style={{
                top: `${topRem}rem`,
                height: `${heightRem}rem`,
                zIndex: 10,
                borderLeft: `3px solid ${borderHex}`,
            }}
        >
            <div className="flex items-start justify-between px-2.5 py-2">
                <div className="flex items-start gap-2 min-w-0">
                    <span className="text-base leading-none mt-0.5 shrink-0">{icon}</span>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-tight truncate text-slate-900">{activity.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {activity.start_time}{activity.end_time ? ` – ${activity.end_time}` : ''}
                        </p>
                    </div>
                </div>
                {activity.booked && (
                    <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center shrink-0 uppercase tracking-widest leading-none ml-1 self-start mt-0.5"
                        style={{ backgroundColor: borderHex + '20', color: borderHex }}
                    >
                        ✓
                    </span>
                )}
            </div>
            {heightRem > 3.5 && (activity.location || activity.notes) && (
                <p className="text-xs text-slate-400 px-2.5 -mt-1 truncate">
                    {activity.location ? `📍 ${activity.location}` : activity.notes}
                </p>
            )}
        </div>
    );
};
