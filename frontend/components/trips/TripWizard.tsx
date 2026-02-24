'use client';
import { useState } from 'react';
import type { TripContext } from '@/lib/trip-context';

interface WizardData {
    // Step 1
    name: string;
    home_base: string;
    start_date: string;
    end_date: string;
    // Step 2
    traveller_count: number;
    split_costs: boolean;
    // Step 3
    trip_type: TripContext['trip_type'];
    vehicle: TripContext['vehicle'];
    flight_type: TripContext['flight_type'];
    // Step 4
    accommodation: TripContext['accommodation'];
    pacing: TripContext['pacing'];
    // Step 5
    budget: string;
    budget_currency: string;
}

const defaults: WizardData = {
    name: '', home_base: '', start_date: '', end_date: '',
    traveller_count: 1, split_costs: false,
    trip_type: 'single_city', vehicle: 'none', flight_type: 'none',
    accommodation: 'unknown', pacing: 'balanced',
    budget: '', budget_currency: 'USD',
};

interface TripWizardProps {
    onSubmit: (data: { name: string; start_date: string; end_date: string; budget?: number; context: TripContext }) => void;
    onCancel: () => void;
    loading?: boolean;
}

export const TripWizard = ({ onSubmit, onCancel, loading }: TripWizardProps) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardData>(defaults);
    const set = (updates: Partial<WizardData>) => setData((d) => ({ ...d, ...updates }));

    const canNext = (): boolean => {
        if (step === 1) return data.name.trim() !== '' && data.start_date !== '' && data.end_date !== '';
        return true;
    };

    const handleSubmit = () => {
        const context: TripContext = {
            home_base: data.home_base || undefined,
            traveller_count: data.traveller_count,
            split_costs: data.split_costs,
            trip_type: data.trip_type,
            vehicle: data.vehicle,
            flight_type: data.flight_type,
            accommodation: data.accommodation,
            pacing: data.pacing,
            budget_currency: data.budget_currency,
        };
        onSubmit({
            name: data.name,
            start_date: data.start_date,
            end_date: data.end_date,
            budget: data.budget ? parseFloat(data.budget) : undefined,
            context,
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
                {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${s === step ? 'bg-primary-600 text-white' : s < step ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
                        }`}>{s}</span>
                ))}
                <span className="ml-2">{['Basics', 'Travellers', 'Transport', 'Stay', 'Budget'][step - 1]}</span>
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Trip name *</label>
                        <input value={data.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g., European Summer 2026" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Departing from</label>
                        <input value={data.home_base} onChange={(e) => set({ home_base: e.target.value })} placeholder="e.g., Sydney, Australia" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">Start date *</label>
                            <input type="date" value={data.start_date} onChange={(e) => set({ start_date: e.target.value })} className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">End date *</label>
                            <input type="date" value={data.end_date} onChange={(e) => set({ end_date: e.target.value })} className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Travellers */}
            {step === 2 && (
                <div className="flex flex-col gap-4">
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
            )}

            {/* Step 3: Trip type + transport */}
            {step === 3 && (
                <div className="flex flex-col gap-4">
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
            )}

            {/* Step 4: Stay + pace */}
            {step === 4 && (
                <div className="flex flex-col gap-4">
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
            )}

            {/* Step 5: Budget */}
            {step === 5 && (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">Total budget (optional)</label>
                            <input type="number" min={0} step="0.01" value={data.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="e.g., 5000" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">Currency</label>
                            <select value={data.budget_currency} onChange={(e) => set({ budget_currency: e.target.value })} className="border border-slate-300 rounded-md px-3 py-2 text-sm">
                                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD'].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button type="button" onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">
                    {step === 1 ? 'Cancel' : '← Back'}
                </button>
                {step < 5 ? (
                    <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext()} className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-40">
                        Next →
                    </button>
                ) : (
                    <button type="button" onClick={handleSubmit} disabled={loading} className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-40">
                        {loading ? 'Creating…' : 'Create trip →'}
                    </button>
                )}
            </div>
        </div>
    );
};
