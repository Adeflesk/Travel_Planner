import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DayActivity } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { LocationSearchBox } from '@/components/shared/LocationSearchBox';

interface ActivityFormProps {
    activity?: Partial<DayActivity>;
    dayId: number;
    onSave: (data: Partial<DayActivity>) => Promise<void>;
    onClose: () => void;
    onDelete?: (id: number) => Promise<void>;
}

export const ActivityForm = ({ activity, dayId, onSave, onClose, onDelete }: ActivityFormProps) => {
    const { register, handleSubmit, setValue, watch } = useForm<Partial<DayActivity>>({
        defaultValues: {
            title: activity?.title || '',
            category: activity?.category || 'other',
            start_time: activity?.start_time || '10:00',
            end_time: activity?.end_time || '',
            location: activity?.location || '',
            notes: activity?.notes || '',
            cost: activity?.cost || undefined,
            booked: activity?.booked || false,
            latitude: activity?.latitude ?? undefined,
            longitude: activity?.longitude ?? undefined,
        }
    });

    const locationValue = watch('location') ?? '';
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: Partial<DayActivity>) => {
        setLoading(true);
        try {
            if (activity?.id) {
                await onSave({ ...data, id: activity.id, day_id: dayId });
            } else {
                await onSave({ ...data, day_id: dayId });
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to save activity');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 sm:items-center sm:justify-center">
            <div className="w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] bg-white sm:rounded-2xl flex flex-col mt-auto shadow-2xl relative">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">{activity?.id ? 'Edit Activity' : 'Add Activity'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-5">
                    <div>
                        <label htmlFor="activity-title" className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                        <input id="activity-title" {...register('title', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Louvre Museum" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="activity-category" className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                            <select id="activity-category" {...register('category')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                <option value="museum">Museum</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="bar">Bar</option>
                                <option value="activity">Activity</option>
                                <option value="transport">Transport</option>
                                <option value="accommodation">Accommodation</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="activity-cost" className="block text-sm font-semibold text-slate-700 mb-1">Cost (estimate)</label>
                            <input id="activity-cost" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="40.00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="activity-start-time" className="block text-sm font-semibold text-slate-700 mb-1">Start Time *</label>
                            <input id="activity-start-time" type="time" {...register('start_time', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label htmlFor="activity-end-time" className="block text-sm font-semibold text-slate-700 mb-1">End Time</label>
                            <input id="activity-end-time" type="time" {...register('end_time')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                        <LocationSearchBox
                            value={locationValue}
                            placeholder="Address or area"
                            onTextChange={(text) => setValue('location', text)}
                            onRetrieve={({ text, lat, lng }) => {
                                setValue('location', text);
                                setValue('latitude', lat);
                                setValue('longitude', lng);
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="activity-notes" className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
                        <textarea id="activity-notes" {...register('notes')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24" placeholder="Confirmation numbers, what to see..." />
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-100 rounded-xl">
                        <label htmlFor="activity-booked" className="text-sm font-semibold text-slate-700 cursor-pointer">Already booked / reserved?</label>
                        <input id="activity-booked" type="checkbox" {...register('booked')} className="w-5 h-5 text-sky-500 rounded border-slate-300" />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        {activity?.id && onDelete ? (
                            <button type="button" onClick={() => { if (activity.id) onDelete(activity.id); }} className="text-rose-500 hover:text-rose-600 text-sm font-semibold">Delete</button>
                        ) : <div />}
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Activity'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
