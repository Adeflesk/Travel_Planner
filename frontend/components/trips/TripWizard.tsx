'use client';
import { useState, useMemo } from 'react';
import type { TripContext } from '@/lib/trip-context';
import { Input, Textarea } from '@/components/ui/Input';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { Button } from '@/components/ui/Button';
import { getLocalTimezone, getSupportedTimezones } from '@/lib/timezone-utils';

interface WizardData {
    // Step 1
    name: string;
    description: string;
    timezone: string;
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
    overnight_flight: boolean;
    // Step 4
    accommodation: TripContext['accommodation'];
    pacing: TripContext['pacing'];
    // Step 5
    budget: string;
    budget_currency: string;
}

const defaults: WizardData = {
    name: '', description: '', timezone: getLocalTimezone(), home_base: '', start_date: '', end_date: '',
    traveller_count: 1, split_costs: false,
    trip_type: 'single_city', vehicle: 'none', flight_type: 'none', overnight_flight: false,
    accommodation: 'unknown', pacing: 'balanced',
    budget: '', budget_currency: 'USD',
};

interface TripWizardProps {
    onSubmit: (data: {
        name: string;
        description?: string;
        timezone?: string;
        start_date: string;
        end_date: string;
        budget?: number;
        context: TripContext;
    }) => void;
    onCancel: () => void;
    loading?: boolean;
}

export const TripWizard = ({ onSubmit, onCancel, loading }: TripWizardProps) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardData>(defaults);
    const set = (updates: Partial<WizardData>) => setData((d) => ({ ...d, ...updates }));

    const timezones = useMemo(() => getSupportedTimezones(), []);

    const canNext = (): boolean => {
        if (step === 1) {
            const hasRequired = data.name.trim() !== '' && data.start_date !== '' && data.end_date !== '';
            if (!hasRequired) return false;
            // Date order validation
            if (data.end_date < data.start_date) return false;
            return true;
        }
        return true;
    };

    const getValidationError = (): string | null => {
        if (step === 1) {
            if (data.start_date && data.end_date && data.end_date < data.start_date) {
                return 'End date cannot be before start date';
            }
        }
        return null;
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
            description: data.description.trim() || undefined,
            timezone: data.timezone || undefined,
            start_date: data.start_date,
            end_date: data.end_date,
            budget: data.budget ? parseFloat(data.budget) : undefined,
            context,
        });
    };

    const error = getValidationError();

    return (
        <div className="flex flex-col gap-8 max-w-2xl mx-auto py-4">
            {/* Step indicator */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex items-center">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${s === step ? 'bg-primary-600 text-white shadow-lg ring-4 ring-primary-100' : s < step ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
                                }`}>{s}</span>
                            {s < 5 && <div className={`w-6 h-0.5 mx-1 ${s < step ? 'bg-primary-200' : 'bg-slate-200'}`} />}
                        </div>
                    ))}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Step {step} of 5</p>
                    <p className="text-xl font-bold text-slate-900 leading-none">{['The Basics', 'Travellers', 'Transport', 'Stay & Pace', 'Budget'][step - 1]}</p>
                </div>
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
                <div className="space-y-6 animate-fade-in-up">
                    <Input
                        label="Trip name"
                        required
                        value={data.name}
                        onChange={(e) => set({ name: e.target.value })}
                        placeholder="e.g., European Summer 2026"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="Start date"
                            required
                            value={data.start_date}
                            onChange={(e) => set({ start_date: e.target.value })}
                            error={error ? ' ' : undefined}
                        />
                        <Input
                            type="date"
                            label="End date"
                            required
                            value={data.end_date}
                            onChange={(e) => set({ end_date: e.target.value })}
                            error={error || undefined}
                        />
                    </div>
                    <AutocompleteInput
                        label="Trip Timezone"
                        value={data.timezone}
                        onSelect={(v) => set({ timezone: v })}
                        onChange={(e) => set({ timezone: e.target.value })}
                        suggestions={timezones}
                        placeholder="Search timezones..."
                        hint="Important for keeping your itinerary times accurate."
                    />
                    <Input
                        label="Departing from"
                        value={data.home_base}
                        onChange={(e) => set({ home_base: e.target.value })}
                        placeholder="e.g., Sydney, Australia"
                    />
                    <Textarea
                        label="Description (optional)"
                        value={data.description}
                        onChange={(e) => set({ description: e.target.value })}
                        placeholder="What's this trip about?"
                        rows={2}
                    />
                </div>
            )}

            {/* Step 2: Travellers */}
            {step === 2 && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex flex-col gap-4">
                        <label className="text-base font-semibold text-slate-800">How many people are going?</label>
                        <div className="flex items-center gap-6">
                            <input
                                type="range"
                                min={1}
                                max={12}
                                value={data.traveller_count}
                                onChange={(e) => set({ traveller_count: parseInt(e.target.value) || 1, split_costs: parseInt(e.target.value) > 1 ? data.split_costs : false })}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 shadow-inner">
                                {data.traveller_count}
                            </div>
                        </div>
                    </div>
                    {data.traveller_count > 1 && (
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${data.split_costs ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300 group-hover:border-primary-400'}`}>
                                    {data.split_costs && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={data.split_costs}
                                    onChange={(e) => set({ split_costs: e.target.checked })}
                                    className="hidden"
                                />
                                <div>
                                    <p className="font-semibold text-slate-900">Split costs equally</p>
                                    <p className="text-sm text-slate-500">Calculate budget and expenses per person automatically</p>
                                </div>
                            </label>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Trip type + transport */}
            {step === 3 && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trip Style</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(['single_city', 'multi_city', 'road_trip', 'international'] as const).map((t) => (
                                <label key={t} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.trip_type === t ? 'bg-primary-50 border-primary-500 shadow-md transform -translate-y-0.5' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                    <input type="radio" name="trip_type" checked={data.trip_type === t} onChange={() => set({ trip_type: t })} className="text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm font-semibold text-slate-800">{{ single_city: 'Single City', multi_city: 'Multi-City Tour', road_trip: 'Road / Rail Trip', international: 'International' }[t]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Driving</h4>
                            <div className="space-y-2">
                                {(['own_car', 'rental', 'none'] as const).map((v) => (
                                    <label key={v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${data.vehicle === v ? 'bg-slate-50 border-slate-300' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                        <input type="radio" name="vehicle" checked={data.vehicle === v} onChange={() => set({ vehicle: v })} className="text-primary-600 focus:ring-primary-500" />
                                        <span className="text-sm text-slate-700">{{ own_car: 'Own car', rental: 'Rental car', none: 'Neither' }[v]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Air Travel</h4>
                            <div className="space-y-2">
                                {(['none', 'return', 'multi_leg', 'comparing'] as const).map((f) => (
                                    <label key={f} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${data.flight_type === f ? 'bg-slate-50 border-slate-300' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                        <input type="radio" name="flight_type" checked={data.flight_type === f} onChange={() => set({ flight_type: f })} className="text-primary-600 focus:ring-primary-500" />
                                        <span className="text-sm text-slate-700">{{ none: 'No flights', return: 'Return', multi_leg: 'Multi-leg', comparing: 'Comparing' }[f]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Overnight inference callout — shown when a flight type is selected */}
                    {data.flight_type !== 'none' && (
                        <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                            <p className="text-sm font-semibold text-sky-900">
                                ✈ Will any of your flights cross midnight?
                            </p>
                            <p className="text-xs text-sky-700">
                                If you depart one day and arrive the next, we&apos;ll flag those legs as overnight when you build your itinerary.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => set({ overnight_flight: true })}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                                        data.overnight_flight
                                            ? 'bg-sky-600 text-white border-sky-600'
                                            : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
                                    }`}
                                >
                                    Yes, overnight
                                </button>
                                <button
                                    type="button"
                                    onClick={() => set({ overnight_flight: false })}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                                        !data.overnight_flight
                                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    No, same-day arrivals
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Stay + pace */}
            {step === 4 && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accommodation</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(['hotel', 'rental_property', 'camping', 'mix', 'unknown'] as const).map((a) => (
                                <label key={a} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.accommodation === a ? 'bg-primary-50 border-primary-500 shadow-md transform -translate-y-0.5' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                    <input type="radio" name="accommodation" checked={data.accommodation === a} onChange={() => set({ accommodation: a })} className="text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm font-semibold text-slate-800">{{ hotel: 'Hotel / Motel', rental_property: 'Rental (Airbnb, etc)', camping: 'Camping', mix: 'Mix', unknown: 'Not sure' }[a]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trip Pace</h4>
                        <div className="flex gap-4">
                            {(['relaxed', 'balanced', 'packed'] as const).map((p) => (
                                <label key={p} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.pacing === p ? 'bg-primary-50 border-primary-500 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                    <input type="radio" name="pacing" checked={data.pacing === p} onChange={() => set({ pacing: p })} className="hidden" />
                                    <span className="text-sm font-bold text-slate-800 uppercase tracking-tighter">{{ relaxed: 'Relaxed', balanced: 'Balanced', packed: 'Packed' }[p]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 5: Budget */}
            {step === 5 && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <Input
                                type="number"
                                label="Total budget"
                                value={data.budget}
                                onChange={(e) => set({ budget: e.target.value })}
                                placeholder="e.g., 5000"
                                inputSize="lg"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">Currency</label>
                            <select
                                value={data.budget_currency}
                                onChange={(e) => set({ budget_currency: e.target.value })}
                                className="h-12 border-2 border-slate-100 rounded-xl px-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                            >
                                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD'].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="p-5 bg-sky-50 border border-sky-100 rounded-2xl flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sky-600 shadow-sm shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-sky-900">Custom Category Limits</p>
                            <p className="text-sm text-sky-800 opacity-80">You can set specific limits for food, transport, and lodging in the trip settings later.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
                    {step === 1 ? 'Cancel' : '← Back'}
                </Button>
                {step < 5 ? (
                    <Button
                        disabled={!canNext()}
                        onClick={() => setStep(step + 1)}
                        className="min-w-[120px]"
                        size="lg"
                    >
                        Next Step →
                    </Button>
                ) : (
                    <Button
                        loading={loading}
                        onClick={handleSubmit}
                        className="min-w-[160px]"
                        size="lg"
                    >
                        Plan My Trip
                    </Button>
                )}
            </div>
        </div>
    );
};
