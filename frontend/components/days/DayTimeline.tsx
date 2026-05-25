import { DayActivity, TripTransport, Accommodation, DayAlert } from '@/lib/types';
import { useState } from 'react';
import { ActivityBlock } from './ActivityBlock';
import { TransportBlock } from './TransportBlock';
import { AccommodationBlock } from '@/components/accommodations';
import { TRANSPORT_ICON, TRANSPORT_COLOR } from '@/lib/transport-config';

interface DayTimelineProps {
    scheduled: DayActivity[];
    unscheduled: DayActivity[];
    onEditActivity: (activity: DayActivity) => void;
    transportItems?: TripTransport[];
    currentDayId?: number;
    currentDayDate?: string;
    accommodations?: Accommodation[];
    onEditTransport?: (t: TripTransport) => void;
    highlightedActivityId?: number;
    /** ID of the item being hovered from the map side (activity id or "transport-{id}") */
    highlightedItemId?: string | null;
    /** Called when a timeline item is hovered (for map panning) */
    onItemHover?: (id: string | null) => void;
    alerts?: DayAlert[] | null;
    onUpdateAlerts?: (alerts: DayAlert[]) => void;
}

const ALERT_STYLES: Record<DayAlert['severity'], { border: string; bg: string; text: string; label: string }> = {
    warning: { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-800', label: 'Warning' },
    info:    { border: 'border-sky-400',   bg: 'bg-sky-50',   text: 'text-sky-800',   label: 'Info'    },
    tip:     { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Tip' },
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am to 11pm (23:00)

export const DayTimeline = ({
    scheduled,
    unscheduled,
    onEditActivity,
    transportItems = [],
    currentDayId,
    currentDayDate,
    accommodations = [],
    onEditTransport,
    highlightedActivityId,
    highlightedItemId,
    onItemHover,
    alerts = [],
    onUpdateAlerts,
}: DayTimelineProps) => {
    const [editingAlertIndex, setEditingAlertIndex] = useState<number | null>(null);
    const [newAlertText, setNewAlertText] = useState('');
    const [newAlertSeverity, setNewAlertSeverity] = useState<DayAlert['severity']>('warning');
    const [showAddAlert, setShowAddAlert] = useState(false);

    const checkInAccommodations = currentDayDate
        ? accommodations.filter(a => a.check_in_date === currentDayDate && a.check_in_time)
        : [];
    const checkOutAccommodations = currentDayDate
        ? accommodations.filter(a => a.check_out_date === currentDayDate && a.check_out_time)
        : [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 relative">
            {/* Alerts section */}
            {((alerts && alerts.length > 0) || onUpdateAlerts) && (
                <div className="mb-6 space-y-2">
                    {(alerts ?? []).map((alert, i) => {
                        const style = ALERT_STYLES[alert.severity];
                        if (editingAlertIndex === i) {
                            return (
                                <div key={`${alert.severity}:${alert.text}`} className={`flex gap-2 items-start p-3 rounded-lg border-l-4 ${style.border} ${style.bg}`}>
                                    <input
                                        autoFocus
                                        className="flex-1 text-sm bg-transparent outline-none border-b border-slate-300"
                                        value={alert.text}
                                        onChange={e => {
                                            const updated = [...(alerts ?? [])];
                                            updated[i] = { ...alert, text: e.target.value };
                                            onUpdateAlerts?.(updated);
                                        }}
                                        onBlur={() => setEditingAlertIndex(null)}
                                    />
                                    <button
                                        className="text-xs text-slate-400 hover:text-red-500 ml-2"
                                        onClick={() => {
                                            const updated = (alerts ?? []).filter((_, j) => j !== i);
                                            onUpdateAlerts?.(updated);
                                            setEditingAlertIndex(null);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={`${alert.severity}:${alert.text}`}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg border-l-4 ${style.border} ${style.bg} cursor-pointer`}
                                onClick={() => onUpdateAlerts && setEditingAlertIndex(i)}
                            >
                                <span className={`text-xs font-bold uppercase tracking-widest mt-0.5 shrink-0 ${style.text}`}>{style.label}</span>
                                <p className={`text-sm ${style.text}`}>{alert.text}</p>
                            </div>
                        );
                    })}

                    {onUpdateAlerts && !showAddAlert && (
                        <button
                            className="text-xs text-slate-400 hover:text-slate-600 mt-1"
                            onClick={() => setShowAddAlert(true)}
                        >
                            + Add alert
                        </button>
                    )}

                    {onUpdateAlerts && showAddAlert && (
                        <div className="flex gap-2 items-start p-3 rounded-lg border border-slate-200 bg-slate-50">
                            <select
                                className="text-xs border border-slate-200 rounded p-1"
                                value={newAlertSeverity}
                                onChange={e => setNewAlertSeverity(e.target.value as DayAlert['severity'])}
                            >
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="tip">Tip</option>
                            </select>
                            <input
                                autoFocus
                                className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1"
                                placeholder="Alert text..."
                                value={newAlertText}
                                onChange={e => setNewAlertText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newAlertText.trim()) {
                                        onUpdateAlerts?.([...(alerts ?? []), { text: newAlertText.trim(), severity: newAlertSeverity }]);
                                        setNewAlertText('');
                                        setShowAddAlert(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setShowAddAlert(false);
                                        setNewAlertText('');
                                    }
                                }}
                            />
                            <button
                                className="text-xs text-slate-500 px-2 py-1 border border-slate-200 rounded hover:bg-slate-100"
                                onClick={() => {
                                    if (newAlertText.trim()) {
                                        onUpdateAlerts?.([...(alerts ?? []), { text: newAlertText.trim(), severity: newAlertSeverity }]);
                                        setNewAlertText('');
                                    }
                                    setShowAddAlert(false);
                                }}
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="relative border-l border-slate-200 ml-10 pb-10">
                {/* Time grid backdrop */}
                <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
                    {HOURS.map((hour) => {
                        const displayHour = hour > 12 ? hour - 12 : hour;
                        const ampm = hour >= 12 ? 'pm' : 'am';
                        return (
                            <div key={hour} className="h-16 relative group">
                                {/* Hairline hour rule */}
                                <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
                                {/* Rail dot */}
                                <span className="absolute -left-[5px] top-0 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors" />
                                {/* Time label */}
                                <span className="absolute -left-[3.5rem] top-0 -translate-y-1/2 text-[11px] font-medium text-slate-400 group-hover:text-slate-600 w-11 text-right transition-colors">
                                    {displayHour}{ampm}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Render activities, transport, and accommodation blocks */}
                <div className="relative w-full h-272"> {/* 17 hours * 4rem */}
                    {scheduled.map(activity => (
                        <ActivityBlock
                            key={activity.id}
                            activity={activity}
                            onClick={() => onEditActivity(activity)}
                            highlighted={highlightedActivityId === activity.id || highlightedItemId === String(activity.id)}
                            onHover={(id) => onItemHover?.(id != null ? String(id) : null)}
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
                                highlighted={highlightedItemId === `transport-${t.id}`}
                                onHover={onItemHover}
                            />
                        );
                    })}
                    {checkInAccommodations.map(a => (
                        <AccommodationBlock
                            key={`checkin-${a.id}`}
                            accommodation={a}
                            type="check-in"
                        />
                    ))}
                    {checkOutAccommodations.map(a => (
                        <AccommodationBlock
                            key={`checkout-${a.id}`}
                            accommodation={a}
                            type="check-out"
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
                                onClick={() => onEditActivity(activity)}
                                className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group flex items-start justify-between"
                            >
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{activity.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1 capitalize">{activity.category || 'Other'}</p>
                                </div>
                                <span className="text-slate-200 group-hover:text-slate-400 text-lg leading-none">›</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unscheduled transport (no departure time) */}
            {currentDayId != null && transportItems.some(t => t.departure_day_id === currentDayId && !t.departure_time) && (
                <div className="mt-6 border-t border-dashed border-slate-200 pt-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Transport — no time set</h3>
                    <div className="space-y-2">
                        {transportItems
                            .filter(t => t.departure_day_id === currentDayId && !t.departure_time)
                            .map(t => {
                                const Icon = TRANSPORT_ICON[t.transport_type] ?? TRANSPORT_ICON.other;
                                const color = TRANSPORT_COLOR[t.transport_type] ?? TRANSPORT_COLOR.other;
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => onEditTransport?.(t)}
                                        className="p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                                        <span className="text-sm font-medium text-slate-700">{t.origin} → {t.destination}</span>
                                        {t.carrier && <span className="text-xs text-slate-400">{t.carrier}</span>}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};
