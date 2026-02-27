import { useState } from 'react';
import { Calendar, MapPin, Type, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DayFormProps {
    initialData?: {
        date: string;
        title?: string;
        location?: string;
        notes?: string;
    };
    onSubmit: (data: { date: string; title: string; location: string; notes: string }) => Promise<void>;
    onCancel: () => void;
    submitLabel?: string;
    isSubmitting?: boolean;
}

export const DayForm = ({
    initialData,
    onSubmit,
    onCancel,
    submitLabel = 'Save',
    isSubmitting
}: DayFormProps) => {
    const [date, setDate] = useState(initialData?.date || '');
    const [title, setTitle] = useState(initialData?.title || '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({ date, title, location, notes });
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label htmlFor="day-date" className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    Date
                </label>
                <input
                    id="day-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                />
            </div>

            <div>
                <label htmlFor="day-title" className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Type className="w-4 h-4 text-sky-500" />
                    Title
                </label>
                <input
                    id="day-title"
                    type="text"
                    placeholder="e.g. Arrival in Tokyo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                />
            </div>

            <div>
                <label htmlFor="day-location" className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-500" />
                    Location
                </label>
                <input
                    id="day-location"
                    type="text"
                    placeholder="e.g. Tokyo, Japan"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                />
            </div>

            <div>
                <label htmlFor="day-notes" className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-500" />
                    Notes
                </label>
                <textarea
                    id="day-notes"
                    placeholder="Add any general notes for this day..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none min-h-[120px] resize-none"
                />
            </div>

            <div className="pt-4 flex gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </form>
    );
};
