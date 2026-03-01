import { useState, useEffect } from 'react';
import { TripDay, TripTransport, TripTransportCreate, TripTransportUpdate, Destination } from '@/lib/types';
import { X } from 'lucide-react';
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
        <div className="max-w-3xl mx-auto pb-24">
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

            <DayTimeline
                scheduled={scheduled}
                unscheduled={unscheduled}
                onEditActivity={openEditForm}
                transportItems={transportItems}
                currentDayId={day.id}
                onEditTransport={openTransportEdit}
            />

            {/* Transport cards below timeline (full detail view) */}
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
