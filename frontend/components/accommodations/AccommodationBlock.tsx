import { Home } from 'lucide-react';
import { Accommodation } from '@/lib/types';

interface AccommodationBlockProps {
    accommodation: Accommodation;
    type: 'check-in' | 'check-out';
    onClick?: () => void;
}

const DAY_START_MINS = 7 * 60; // 7am

function timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

const STYLE = {
    'check-in': {
        border: '#16a34a',
        iconColor: 'text-green-600',
        bg: 'bg-green-50',
        label: 'Check-in',
        textColor: 'text-green-800',
    },
    'check-out': {
        border: '#d97706',
        iconColor: 'text-amber-600',
        bg: 'bg-amber-50',
        label: 'Check-out',
        textColor: 'text-amber-800',
    },
} as const;

export const AccommodationBlock = ({ accommodation, type, onClick }: AccommodationBlockProps) => {
    const time = type === 'check-in' ? accommodation.check_in_time : accommodation.check_out_time;
    if (!time) return null;

    const startMins = timeToMins(time);
    const topOffsetMins = Math.max(0, startMins - DAY_START_MINS);
    const topRem = (topOffsetMins / 60) * 4;
    const heightRem = 3;

    const s = STYLE[type];

    return (
        <div
            onClick={onClick}
            className={`absolute left-0 right-0 ${s.bg} rounded-r-lg shadow-sm border border-slate-100 cursor-pointer overflow-hidden transition-all hover:shadow-md`}
            style={{ top: `${topRem}rem`, height: `${heightRem}rem`, zIndex: 10, borderLeft: `3px solid ${s.border}` }}
        >
            <div className="flex items-center gap-2 px-2.5 py-2">
                <Home className={`w-4 h-4 shrink-0 ${s.iconColor}`} />
                <div className="min-w-0">
                    <h4 className={`font-semibold text-sm leading-tight truncate ${s.textColor}`}>
                        {s.label}: {accommodation.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                        {time}
                        {accommodation.address ? ` · ${accommodation.address}` : ''}
                        {accommodation.confirmation_number ? ` · ${accommodation.confirmation_number}` : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};
