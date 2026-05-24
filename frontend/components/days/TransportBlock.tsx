import { TripTransport } from '@/lib/types';
import { TRANSPORT_ICON, TRANSPORT_COLOR } from '@/lib/transport-config';

interface TransportBlockProps {
    transport: TripTransport;
    currentDayId: number;
    onClick: () => void;
    highlighted?: boolean;
    onHover?: (id: string | null) => void;
}

const DAY_START_MINS = 7 * 60; // 7am

function timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export const TransportBlock = ({ transport, currentDayId, onClick, highlighted, onHover }: TransportBlockProps) => {
    const isDeparture = transport.departure_day_id === currentDayId;
    const time = isDeparture ? transport.departure_time : transport.arrival_time;
    if (!time) return null;

    const startMins = timeToMins(time);
    const topOffsetMins = Math.max(0, startMins - DAY_START_MINS);
    const topRem = (topOffsetMins / 60) * 4;

    // Calculate duration-proportional height like ActivityBlock
    const MIN_HEIGHT_REM = 3; // minimum so text remains readable
    let heightRem = MIN_HEIGHT_REM;
    if (isDeparture && transport.arrival_time && transport.arrival_day_id === currentDayId) {
        // Same-day journey: use actual duration
        const durationMins = timeToMins(transport.arrival_time) - startMins;
        if (durationMins > 0) {
            heightRem = Math.max(MIN_HEIGHT_REM, (durationMins / 60) * 4);
        }
    }

    const Icon = TRANSPORT_ICON[transport.transport_type] ?? TRANSPORT_ICON.other;
    const hex = TRANSPORT_COLOR[transport.transport_type] ?? TRANSPORT_COLOR.other;

    if (isDeparture) {
        return (
            <div
                onClick={onClick}
                onMouseEnter={() => onHover?.(`transport-${transport.id}`)}
                onMouseLeave={() => onHover?.(null)}
                className={`absolute left-0 right-0 bg-white rounded-r-lg shadow-sm border cursor-pointer overflow-hidden transition-all hover:shadow-md ${highlighted ? 'ring-2 ring-sky-400 ring-offset-1 border-sky-200 shadow-md' : 'border-slate-100'}`}
                style={{ top: `${topRem}rem`, height: `${heightRem}rem`, zIndex: 10, borderLeft: `3px solid ${hex}` }}
            >
                <div className="flex items-center gap-2 px-2.5 py-2">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: hex }} />
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-tight truncate text-slate-900">
                            {transport.origin} → {transport.destination}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                            {transport.departure_time}
                            {transport.carrier ? ` · ${transport.carrier}` : ''}
                            {transport.booked && transport.transport_type !== 'drive' ? ' · ✓' : ''}
                            {transport.arrival_day_id !== currentDayId ? ' · next day' : transport.arrival_time ? ` → ${transport.arrival_time}` : ''}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Arrival-only compact block
    return (
        <div
            onClick={onClick}
            className="absolute left-0 right-0 bg-white rounded-r-lg border border-slate-100 cursor-pointer overflow-hidden transition-all opacity-70 hover:opacity-100 hover:shadow-sm"
            style={{ top: `${topRem}rem`, height: `${heightRem * 0.75}rem`, zIndex: 10, borderLeft: `3px solid ${hex}` }}
        >
            <div className="flex items-center gap-2 px-2.5 py-1.5">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
                <p className="text-xs font-medium text-slate-500 truncate">arrived from {transport.origin}</p>
            </div>
        </div>
    );
};
