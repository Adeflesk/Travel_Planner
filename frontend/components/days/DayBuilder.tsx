import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TripDay, TripTransport, TripTransportCreate, TripTransportUpdate, Destination } from '@/lib/types';
import { X, Map, ChevronDown, ChevronUp } from 'lucide-react';
import {
    ActivityForm,
    DayForm,
    DayHeader,
    DayTimeline,
    useDayBuilder
} from './';
import { Button } from '@/components/ui/Button';
import { TransportForm, TransportItem, useTransport } from '@/components/transport';
import { tripApi, destinationApi } from '@/lib/api';
import { useTripContext } from '@/lib/trip-context';
import { useTripAccommodations, AccommodationDayBadge } from '@/components/accommodations';

const DayMap = dynamic(() => import('@/components/map/DayMap'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg animate-pulse">
            <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="h-2.5 w-20 bg-slate-200 rounded" />
            </div>
        </div>
    ),
});

const MAP_OPEN_KEY = 'daymap_expanded';

interface DayBuilderProps {
    day: TripDay;
    tripId: number;
    onRefresh: () => void;
}

export const DayBuilder = ({ day, tripId, onRefresh }: DayBuilderProps) => {
    const {
        selectedActivity,
        isFormOpen,
        setIsFormOpen,
        showEditDayModal,
        setShowEditDayModal,
        isSubmitting,
        handleSaveActivity,
        handleDeleteActivity,
        handleUpdateDay,
        handleDeleteDay,
        openCreateForm,
        openEditForm
    } = useDayBuilder(day, onRefresh);

    const activities = day.activities || [];
    const scheduled = activities.filter(a => a.start_time).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    const unscheduled = activities.filter(a => !a.start_time);

    // Transport state
    const { items: transportItems, reload: reloadTransport, createTransport, updateTransport, deleteTransport } = useTransport(tripId, day.id);
    const [tripDays, setTripDays] = useState<TripDay[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [isTransportFormOpen, setIsTransportFormOpen] = useState(false);
    const [selectedTransport, setSelectedTransport] = useState<TripTransport | null>(null);
    const [isTransportSubmitting, setIsTransportSubmitting] = useState(false);

    // Accommodation badge for this day
    const { getBadgeType } = useTripAccommodations(tripId);
    const accommodationBadge = getBadgeType(day.date);

    // Map state
    const tripCtx = useTripContext();
    const [mapExpanded, setMapExpanded] = useState(() => {
        try { return localStorage.getItem(MAP_OPEN_KEY) === 'true'; } catch { return false; }
    });
    const [highlightedActivityId, setHighlightedActivityId] = useState<number | undefined>();

    // Bidirectional hover linking between timeline ↔ map
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    const toggleMap = useCallback(() => {
        setMapExpanded(prev => {
            const next = !prev;
            try { localStorage.setItem(MAP_OPEN_KEY, String(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    // Load all trip days and destinations for the transport form
    useEffect(() => {
        Promise.all([
            tripApi.getDays(tripId),
            destinationApi.getByTripId(tripId),
        ]).then(([daysRes, destsRes]) => {
            setTripDays(daysRes.data);
            setDestinations(destsRes.data);
        }).catch(() => {});
    }, [tripId]);

    const handleSaveTransport = async (data: TripTransportCreate | TripTransportUpdate) => {
        setIsTransportSubmitting(true);
        try {
            if (selectedTransport) {
                await updateTransport(selectedTransport.id, data as TripTransportUpdate);
            } else {
                await createTransport(data as TripTransportCreate);
            }
            setIsTransportFormOpen(false);
            setSelectedTransport(null);
        } catch (err) {
            console.error('Error saving transport:', err);
        } finally {
            setIsTransportSubmitting(false);
        }
    };

    const handleDeleteTransport = async () => {
        if (!selectedTransport) return;
        try {
            await deleteTransport(selectedTransport.id);
            setIsTransportFormOpen(false);
            setSelectedTransport(null);
        } catch (err) {
            console.error('Error deleting transport:', err);
        }
    };

    const openTransportEdit = (t: TripTransport) => {
        setSelectedTransport(t);
        setIsTransportFormOpen(true);
    };

    return (
        <div className="pb-24">
            {/* Two-column grid on lg+: timeline left, sticky map right */}
            <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-5 lg:items-start">

                {/* ── Left column ─────────────────────────────────────── */}
                <div className="max-w-3xl mx-auto lg:mx-0 lg:max-w-none">
                    <DayHeader
                        day={day}
                        tripId={tripId}
                        onEditDay={() => setShowEditDayModal(true)}
                        onAddActivity={openCreateForm}
                        onAddTransport={() => {
                            setSelectedTransport(null);
                            setIsTransportFormOpen(true);
                        }}
                        onDestinationChanged={onRefresh}
                    />

                    {/* Mobile-only collapsible map (hidden on lg+) */}
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden lg:hidden">
                        <button
                            onClick={toggleMap}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                            <span className="flex items-center gap-2">
                                <Map className="w-4 h-4 text-blue-500" />
                                Day Map
                            </span>
                            {mapExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {mapExpanded && (
                            <div className="h-72 isolate">
                                <DayMap
                                    day={day}
                                    destinations={destinations}
                                    activities={activities}
                                    transports={transportItems}
                                    tripContext={tripCtx?.tripContext}
                                    onActivityClick={setHighlightedActivityId}
                                    hoveredItemId={hoveredItemId}
                                    onMarkerHover={setHoveredItemId}
                                />
                            </div>
                        )}
                    </div>

                    {accommodationBadge && (
                        <div className="mb-4">
                            <AccommodationDayBadge
                                type={accommodationBadge.type}
                                name={accommodationBadge.accommodation.name}
                            />
                        </div>
                    )}

                    <DayTimeline
                        scheduled={scheduled}
                        unscheduled={unscheduled}
                        onEditActivity={openEditForm}
                        transportItems={transportItems}
                        currentDayId={day.id}
                        onEditTransport={openTransportEdit}
                        highlightedActivityId={highlightedActivityId}
                        highlightedItemId={hoveredItemId}
                        onItemHover={setHoveredItemId}
                    />

                    {/* Transport cards below timeline */}
                    {transportItems.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Transport</h3>
                            {transportItems.map(t => (
                                <TransportItem
                                    key={t.id}
                                    transport={t}
                                    currentDayId={day.id}
                                    onEdit={openTransportEdit}
                                    onDelete={deleteTransport}
                                    onReload={reloadTransport}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right column: sticky map (desktop only) ──────────── */}
                <aside className="hidden lg:block">
                    <div
                        className="sticky top-4 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden isolate"
                        style={{ height: 'calc(100vh - 6rem)' }}
                    >
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <Map className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Day Map</span>
                        </div>
                        <div className="h-[calc(100%-45px)]">
                            <DayMap
                                day={day}
                                destinations={destinations}
                                activities={activities}
                                transports={transportItems}
                                tripContext={tripCtx?.tripContext}
                                onActivityClick={setHighlightedActivityId}
                                hoveredItemId={hoveredItemId}
                                onMarkerHover={setHoveredItemId}
                            />
                        </div>
                    </div>
                </aside>
            </div>

            {/* ── Modals ───────────────────────────────────────────────── */}

            {/* Activity Form Modal */}
            {isFormOpen && (
                <ActivityForm
                    activity={selectedActivity || undefined}
                    dayId={day.id}
                    onSave={handleSaveActivity}
                    onClose={() => setIsFormOpen(false)}
                    onDelete={selectedActivity?.id ? handleDeleteActivity : undefined}
                />
            )}

            {/* Transport Form Modal */}
            {isTransportFormOpen && (
                <TransportForm
                    tripDays={tripDays}
                    destinations={destinations}
                    defaultDayId={day.id}
                    initialData={selectedTransport ?? undefined}
                    onSave={handleSaveTransport}
                    onDelete={selectedTransport ? handleDeleteTransport : undefined}
                    onClose={() => {
                        setIsTransportFormOpen(false);
                        setSelectedTransport(null);
                    }}
                    isSubmitting={isTransportSubmitting}
                />
            )}

            {/* Edit Day Modal */}
            {showEditDayModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">Edit Day Details</h2>
                            <button onClick={() => setShowEditDayModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <DayForm
                            initialData={{
                                date: day.date,
                                title: day.title || '',
                                location: day.location || '',
                                notes: day.notes || ''
                            }}
                            onSubmit={handleUpdateDay}
                            onCancel={() => setShowEditDayModal(false)}
                            submitLabel="Save Changes"
                            isSubmitting={isSubmitting}
                        />

                        <div className="px-6 pb-6 -mt-4">
                            <Button
                                type="button"
                                variant="danger"
                                className="w-full"
                                onClick={() => {
                                    handleDeleteDay().then(() => {
                                        window.location.href = `/trips/${day.trip_id}`;
                                    });
                                }}
                            >
                                Delete Day
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
