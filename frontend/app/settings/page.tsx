'use client';

import { useSettings } from '@/lib/settings-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

interface SettingsFormData {
    default_currency: string;
    home_base: string;
    road_trip_builder: boolean;
    expense_tracking: boolean;
    packing_list: boolean;
}

function SettingsContent() {
    const { settings, loading, error, updateSettings } = useSettings();

    const { register, handleSubmit, reset } = useForm<SettingsFormData>({
        defaultValues: {
            default_currency: 'USD',
            home_base: '',
            road_trip_builder: true,
            expense_tracking: true,
            packing_list: true,
        }
    });

    useEffect(() => {
        if (settings) {
            reset({
                default_currency: settings.default_currency,
                home_base: settings.home_base || '',
                road_trip_builder: settings.feature_flags.road_trip_builder ?? true,
                expense_tracking: settings.feature_flags.expense_tracking ?? true,
                packing_list: settings.feature_flags.packing_list ?? true,
            });
        }
    }, [settings, reset]);

    const onSubmit = async (data: SettingsFormData) => {
        try {
            await updateSettings({
                default_currency: data.default_currency,
                home_base: data.home_base,
                feature_flags: {
                    ...settings?.feature_flags,
                    road_trip_builder: data.road_trip_builder,
                    expense_tracking: data.expense_tracking,
                    packing_list: data.packing_list,
                }
            });
            alert('Settings saved successfully!');
        } catch {
            alert('Failed to save settings.');
        }
    };

    if (loading) return <div className="p-8 text-center bg-slate-50 min-h-screen">Loading settings...</div>;
    if (error) return <div className="p-8 text-center text-rose-500 bg-slate-50 min-h-screen">{error}</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-8">Settings</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">

                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Defaults</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Default Currency</label>
                                <select {...register('default_currency')} className="w-full sm:w-1/2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="AUD">AUD (A$)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Used for planning estimates and new expenses.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Home Base</label>
                                <input {...register('home_base')} className="w-full sm:w-1/2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. SFO or London" />
                                <p className="text-xs text-slate-500 mt-1">Used as a default starting point for returning journeys.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Feature Toggles</h2>
                        <p className="text-sm text-slate-500 mb-5">Disable features you don&apos;t use to simplify your trip planning experience. No data is deleted.</p>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm">Road Trip Builder</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Advanced segment builder for complex drives with stops.</div>
                                </div>
                                <input type="checkbox" {...register('road_trip_builder')} className="w-5 h-5 text-sky-500 rounded border-slate-300" />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm">Expense Tracking</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Track paid expenses against your trip budget.</div>
                                </div>
                                <input type="checkbox" {...register('expense_tracking')} className="w-5 h-5 text-sky-500 rounded border-slate-300" />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm">Packing List</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Checklist functionality for tracking luggage.</div>
                                </div>
                                <input type="checkbox" {...register('packing_list')} className="w-5 h-5 text-sky-500 rounded border-slate-300" />
                            </label>
                        </div>
                    </section>

                    <div className="pt-6 flex justify-end">
                        <Button variant="primary" type="submit">Save Settings</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsContent />
        </ProtectedRoute>
    );
}
