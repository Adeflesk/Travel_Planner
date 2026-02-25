'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSettings } from '@/lib/settings-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function SettingsContent() {
    const { settings, isLoading, error, updateSettings, refreshSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [localSettings, setLocalSettings] = useState(() => ({
        default_currency: settings?.default_currency || 'USD',
        home_base: settings?.home_base || '',
        feature_flags: settings?.feature_flags || {},
    }));

    // Update local state when settings loads
    React.useEffect(() => {
        if (settings) {
            setLocalSettings({
                default_currency: settings.default_currency,
                home_base: settings.home_base || '',
                feature_flags: settings.feature_flags,
            });
        }
    }, [settings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateSettings(localSettings);
            alert('Settings updated successfully!');
        } catch {
            alert('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleFeatureFlag = (key: string) => {
        setLocalSettings(prev => ({
            ...prev,
            feature_flags: {
                ...prev.feature_flags,
                [key]: !prev.feature_flags[key]
            }
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex justify-center items-center">
                <p className="text-slate-500">Loading settings...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
                <p className="text-red-500">{error}</p>
                <Button onClick={refreshSettings}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-display font-semibold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your application preferences and default settings.</p>
            </div>

            <Card padding="lg">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-medium text-slate-800">General</h2>

                        <div className="grid gap-2">
                            <label htmlFor="default_currency" className="text-sm font-medium text-slate-700">
                                Default Currency
                            </label>
                            <select
                                id="default_currency"
                                className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                value={localSettings.default_currency}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, default_currency: e.target.value }))}
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="JPY">JPY (¥)</option>
                                <option value="CAD">CAD ($)</option>
                                <option value="AUD">AUD ($)</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="home_base" className="text-sm font-medium text-slate-700">
                                Home Base
                            </label>
                            <input
                                type="text"
                                id="home_base"
                                placeholder="e.g. London, UK"
                                className="w-full sm:w-96 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                value={localSettings.home_base}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, home_base: e.target.value }))}
                            />
                            <p className="text-xs text-slate-500">Set your usual starting point for journeys.</p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100 border-none" />

                    <div className="space-y-4">
                        <h2 className="text-xl font-medium text-slate-800">Features</h2>
                        <p className="text-sm text-slate-500">Toggle experimental or optional features.</p>

                        <div className="space-y-3">
                            {['road_trip_builder', 'expense_tracking', 'packing_list'].map(flag => (
                                <label key={flag} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        checked={localSettings.feature_flags[flag] === true}
                                        onChange={() => toggleFeatureFlag(flag)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        {flag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </Card>
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
