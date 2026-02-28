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
    const heightRem = 3; // fixed 3rem height for transport blocks

    const icon = TYPE_ICON[transport.transport_type] ?? '🚀';

    if (isDeparture) {
        return (
            <div
                onClick={onClick}
                className="absolute left-0 right-0 rounded-lg p-2.5 shadow-sm border bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100 cursor-pointer overflow-hidden transition-all"
                style={{ top: `${topRem}rem`, height: `${heightRem}rem`, zIndex: 10 }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{icon}</span>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-tight truncate">
                            {transport.origin} → {transport.destination}
                        </h4>
                        <p className="text-xs opacity-75 truncate">
                            {transport.departure_time}
                            {transport.carrier ? ` · ${transport.carrier}` : ''}
                            {transport.booked ? ' · Booked ✓' : ''}
                            {transport.arrival_day_id !== currentDayId ? ' → next day' : transport.arrival_time ? ` → ${transport.arrival_time}` : ''}
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
            className="absolute left-0 right-0 rounded-lg p-2 shadow-sm border bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100 cursor-pointer overflow-hidden transition-all"
            style={{ top: `${topRem}rem`, height: `${heightRem * 0.75}rem`, zIndex: 10 }}
        >
            <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <p className="text-xs font-medium truncate">← arrived from {transport.origin} at {transport.arrival_time}</p>
            </div>
        </div>
    );
};
