import { TripTransport, TransportType } from '@/lib/types';

interface TransportBlockProps {
    transport: TripTransport;
    currentDayId: number;
    onClick: () => void;
}

const TYPE_ICON: Record<TransportType, string> = {
    flight: '✈',
    train: '🚆',
    bus: '🚌',
    drive: '🚗',
    ferry: '⛴',
    other: '🚀',
};

// Hex colors matching design-tokens.css transport colors
const TYPE_HEX: Record<TransportType, string> = {
    flight: '#0EA5E9',  // sky-500
    train: '#8B5CF6',   // violet-500
    bus: '#22C55E',     // green-500
    drive: '#F59E0B',   // amber-500
    ferry: '#06B6D4',   // cyan-500
    other: '#94A3B8',   // slate-400
};

const DAY_START_MINS = 7 * 60; // 7am

function timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export const TransportBlock = ({ transport, currentDayId, onClick }: TransportBlockProps) => {
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

    const icon = TYPE_ICON[transport.transport_type] ?? '🚀';
    const hex = TYPE_HEX[transport.transport_type] ?? TYPE_HEX.other;

    if (isDeparture) {
        return (
            <div
                onClick={onClick}
                className="absolute left-0 right-0 bg-white rounded-r-lg shadow-sm border border-slate-100 hover:shadow-md cursor-pointer overflow-hidden transition-all"
                style={{ top: `${topRem}rem`, height: `${heightRem}rem`, zIndex: 10, borderLeft: `3px solid ${hex}` }}
            >
                <div className="flex items-center gap-2 px-2.5 py-2">
                    <span className="text-base leading-none shrink-0">{icon}</span>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-tight truncate text-slate-900">
                            {transport.origin} → {transport.destination}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                            {transport.departure_time}
                            {transport.carrier ? ` · ${transport.carrier}` : ''}
                            {transport.booked ? ' · ✓' : ''}
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
                <span className="text-sm shrink-0">{icon}</span>
                <p className="text-xs font-medium text-slate-500 truncate">arrived from {transport.origin}</p>
            </div>
        </div>
    );
};
