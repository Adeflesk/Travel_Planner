'use client';
import { useState } from 'react';
import type { TripContext } from '@/lib/trip-context';
import { Button } from '@/components/ui/Button';

interface TripSettingsProps {
    tripId: number;
    context: TripContext | null;
    defaultCurrency?: string;
    onSave: (context: TripContext, defaultCurrency: string) => Promise<void>;
    onClose: () => void;
}

export const TripSettings = ({ context, defaultCurrency, onSave, onClose }: TripSettingsProps) => {
    const [currency, setCurrency] = useState(defaultCurrency || context?.budget_currency || 'USD');
    const [data, setData] = useState<TripContext>({
        home_base: context?.home_base || '',
        traveller_count: context?.traveller_count || 1,
        split_costs: context?.split_costs || false,
        trip_type: context?.trip_type || 'single_city',
        vehicle: context?.vehicle || 'none',
        flight_type: context?.flight_type || 'none',
        accommodation: context?.accommodation || 'unknown',
        pacing: context?.pacing || 'balanced',
        budget_currency: context?.budget_currency || 'USD',
    });
    const [loading, setLoading] = useState(false);

    const set = (updates: Partial<TripContext>) => setData((d) => ({ ...d, ...updates }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSave(data, currency);
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to save trip settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:rounded-lg sm:border sm:border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-semibold text-slate-900">Trip Context</h3>
                <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">
                    Close
                </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-8">
                {/* Travellers */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Travellers</h4>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Number of travellers</label>
                        <input type="number" min={1} max={20} value={data.traveller_count} onChange={(e) => set({ traveller_count: parseInt(e.target.value) || 1, split_costs: parseInt(e.target.value) > 1 ? data.split_costs : false })} className="border border-slate-300 rounded-md px-3 py-2 text-sm w-24" />
                    </div>
                    {data.traveller_count > 1 && (
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={data.split_costs} onChange={(e) => set({ split_costs: e.target.checked })} className="rounded border-gray-300" />
                            Split costs equally between travellers
                        </label>
                    )}
                </div>

                {/* Transport */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Transport</h4>
                    <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Trip type</div>
                        {(['single_city', 'multi_city', 'road_trip', 'international'] as const).map((t) => (
                            <label key={t} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                                <input type="radio" checked={data.trip_type === t} onChange={() => set({ trip_type: t })} />
                                {{ single_city: 'Single city / weekend', multi_city: 'Multi-city tour', road_trip: 'Road / rail trip', international: 'International' }[t]}
                            </label>
                        ))}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Car</div>
                        {(['own_car', 'rental', 'none'] as const).map((v) => (
                            <label key={v} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                                <input type="radio" checked={data.vehicle === v} onChange={() => set({ vehicle: v })} />
                                {{ own_car: 'Own car', rental: 'Rental car', none: 'Neither / undecided' }[v]}
                            </label>
                        ))}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Flights</div>
                        {(['none', 'return', 'multi_leg', 'comparing'] as const).map((f) => (
                            <label key={f} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                                <input type="radio" checked={data.flight_type === f} onChange={() => set({ flight_type: f })} />
                                {{ none: 'No flights', return: 'Return (no layovers)', multi_leg: 'Multi-leg', comparing: 'Comparing options & dates' }[f]}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Stay & Pace */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Stay & Pacing</h4>
                    <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Accommodation</div>
                        {(['hotel', 'rental_property', 'camping', 'mix', 'unknown'] as const).map((a) => (
                            <label key={a} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                                <input type="radio" checked={data.accommodation === a} onChange={() => set({ accommodation: a })} />
                                {{ hotel: 'Hotel / motel', rental_property: 'Rental property (Airbnb, etc.)', camping: 'Camping', mix: 'Mix / undecided', unknown: 'Not sure yet' }[a]}
                            </label>
                        ))}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Trip pacing</div>
                        {(['relaxed', 'balanced', 'packed'] as const).map((p) => (
                            <label key={p} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                                <input type="radio" checked={data.pacing === p} onChange={() => set({ pacing: p })} />
                                {{ relaxed: 'Relaxed — few stops, long stays', balanced: 'Balanced', packed: 'Packed — many stops, short stays' }[p]}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Financials */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Financials</h4>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Default Currency</label>
                        <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="border border-slate-300 rounded-md px-3 py-2 text-sm w-24 uppercase" placeholder="USD" />
                    </div>
                </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end sticky bottom-0 bg-white z-10">
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
                </div>
            </div>
        </div>
    );
};
