import { TripDay } from '@/lib/types';
import { X } from 'lucide-react';
import {
    ActivityForm,
    DayForm,
    DayHeader,
    DayTimeline,
    useDayBuilder
} from './';
import { Button } from '@/components/ui/Button';

interface DayBuilderProps {
    day: TripDay;
    tripId: number;
    onRefresh: () => void;
}

export const DayBuilder = ({ day, onRefresh }: DayBuilderProps) => {
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
    const scheduled = activities.filter(a => a.start_time).sort((a, b) => a.start_time.localeCompare(b.start_time));
    const unscheduled = activities.filter(a => !a.start_time);

    return (
        <div className="max-w-3xl mx-auto pb-24">
            <DayHeader
                day={day}
                onEditDay={() => setShowEditDayModal(true)}
                onAddActivity={openCreateForm}
            />

            <DayTimeline
                scheduled={scheduled}
                unscheduled={unscheduled}
                onEditActivity={openEditForm}
            />

            {/* Activity Form Modal */}

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
