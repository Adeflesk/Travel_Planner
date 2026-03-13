'use client';
import { useState, useMemo, useRef } from 'react';
import type { TripContext } from '@/lib/trip-context';
import { Input, Textarea } from '@/components/ui/Input';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { Button } from '@/components/ui/Button';
import { getLocalTimezone, getSupportedTimezones, formatTimezoneLabel } from '@/lib/timezone-utils';
import { TransportLocationSearch } from '@/components/transport/TransportLocationSearch';
import type { TransportLocation } from '@/components/transport/TransportLocationSearch';
type Coords = { lat: number; lng: number };

interface WizardData {
    // Step 1
    name: string;
    description: string;
    timezone: string;
    home_base: string;
    first_destination: string;
    start_date: string;
    end_date: string;
    // Step 2
    traveller_count: number;
    split_costs: boolean;
    // Context defaults (not shown in wizard, passed to TripContext)
    trip_type: TripContext['trip_type'];
    vehicle: TripContext['vehicle'];
    flight_type: TripContext['flight_type'];
    accommodation: TripContext['accommodation'];
    pacing: TripContext['pacing'];
    // Step 3
    budget: string;
    budget_currency: string;
}

const defaults: WizardData = {
    name: '', description: '', timezone: getLocalTimezone(), home_base: '', first_destination: '', start_date: '', end_date: '',
    traveller_count: 1, split_costs: false,
    trip_type: 'single_city', vehicle: 'none', flight_type: 'none',
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
        default_currency?: string;
        first_destination?: string;
        home_base_coords?: Coords;
        first_destination_coords?: Coords;
        context: TripContext;
    }) => void;
    onCancel: () => void;
    loading?: boolean;
}

export const TripWizard = ({ onSubmit, onCancel, loading }: TripWizardProps) => {
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [data, setData] = useState<WizardData>(defaults);
    const set = (updates: Partial<WizardData>) => setData((d) => ({ ...d, ...updates }));
    const [showTimezoneOverride, setShowTimezoneOverride] = useState(false);
    const validatedCoords = useRef<{ home_base?: Coords | null; first_destination?: Coords | null }>({});

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
            default_currency: data.budget_currency,
            first_destination: data.first_destination.trim() || undefined,
            home_base_coords: validatedCoords.current.home_base ?? undefined,
            first_destination_coords: validatedCoords.current.first_destination ?? undefined,
            context,
        });
    };

    const handleNext = () => {
        setDirection('forward');
        setStep(step + 1);
    };

    const handleBack = () => {
        setDirection('back');
        setStep(step - 1);
    };

    const stepAnimation = direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

    const error = getValidationError();

    return (
        <div className="flex flex-col gap-8 max-w-2xl mx-auto py-4">
            {/* Step indicator */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-900 leading-none" style={{ fontFamily: 'var(--font-display), serif' }}>
                        {['The Basics', 'Travellers', 'Budget'][step - 1]}
                    </h2>
                    <p className="text-xs font-medium text-slate-400 tabular-nums">
                        {step} / 3
                    </p>
                </div>
                {/* Progress bar */}
                <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-primary-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
                <div className={`space-y-6 ${stepAnimation}`}>
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
                    <TransportLocationSearch
                        label="Departing from"
                        value={data.home_base}
                        placeholder="e.g., Sydney, Australia"
                        onChange={(val) => set({ home_base: val })}
                        onSelect={(loc: TransportLocation) => {
                            set({ home_base: loc.name });
                            validatedCoords.current.home_base = { lat: loc.lat, lng: loc.lng };
                        }}
                    />
                    <TransportLocationSearch
                        label="First destination (optional)"
                        value={data.first_destination}
                        placeholder="e.g., Paris, France"
                        onChange={(val) => set({ first_destination: val })}
                        onSelect={(loc: TransportLocation) => {
                            set({ first_destination: loc.name });
                            validatedCoords.current.first_destination = { lat: loc.lat, lng: loc.lng };
                            if (loc.timezone) {
                                set({ timezone: loc.timezone });
                                setShowTimezoneOverride(false);
                            }
                        }}
                    />
                    {/* Timezone display */}
                    {data.timezone && !showTimezoneOverride && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 -mt-2">
                            <span>Timezone:</span>
                            <span className="font-medium text-slate-800">
                                {formatTimezoneLabel(data.timezone, data.start_date ? new Date(data.start_date) : undefined)}
                            </span>
                            <span className="text-slate-300">·</span>
                            <button
                                type="button"
                                onClick={() => setShowTimezoneOverride(true)}
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Change
                            </button>
                        </div>
                    )}
                    {showTimezoneOverride && (
                        <AutocompleteInput
                            label="Trip Timezone"
                            value={data.timezone}
                            onSelect={(v) => {
                                set({ timezone: v });
                                setShowTimezoneOverride(false);
                            }}
                            onChange={(e) => set({ timezone: e.target.value })}
                            suggestions={timezones}
                            placeholder="Search timezones..."
                            hint="Important for keeping your itinerary times accurate."
                        />
                    )}
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
                <div className={`space-y-8 ${stepAnimation}`}>
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

            {/* Step 3: Budget */}
            {step === 3 && (
                <div className={`space-y-8 ${stepAnimation}`}>
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
                    {data.traveller_count > 1 && data.budget && parseFloat(data.budget) > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-primary-50 border border-primary-100 rounded-xl text-sm text-primary-700 animate-pop-in">
                            <span className="font-semibold">
                                {new Intl.NumberFormat('en', {
                                    style: 'currency',
                                    currency: data.budget_currency,
                                    maximumFractionDigits: 0,
                                }).format(parseFloat(data.budget) / data.traveller_count)}
                            </span>
                            <span className="text-primary-600">
                                per person ({data.traveller_count} travellers)
                            </span>
                        </div>
                    )}
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
                <Button variant="ghost" onClick={step === 1 ? onCancel : handleBack}>
                    {step === 1 ? 'Cancel' : '← Back'}
                </Button>
                {step < 3 ? (
                    <Button
                        disabled={!canNext()}
                        onClick={handleNext}
                        className="min-w-[120px]"
                        size="lg"
                    >
                        Next Step →
                    </Button>
                ) : (
                    <Button
                        loading={loading}
                        onClick={handleSubmit}
                        className="min-w-[160px] !bg-secondary-500 hover:!bg-secondary-600 !border-secondary-500 hover:!border-secondary-600 !shadow-lg !shadow-secondary-500/25"
                        size="lg"
                    >
                        Plan My Trip
                    </Button>
                )}
            </div>
        </div>
    );
};
