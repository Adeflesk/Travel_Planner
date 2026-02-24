'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserSettings } from '@/lib/types';
import { settingsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface SettingsContextType {
    settings: UserSettings | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    updateSettings: (data: Partial<UserSettings>) => Promise<UserSettings | void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const res = await settingsApi.get();
            setSettings(res.data);
        } catch (err: unknown) {
            console.error('Failed to fetch user settings:', err);
            const message = err instanceof Error ? err.message : 'Error fetching settings';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = async (updates: Partial<UserSettings>) => {
        try {
            const res = await settingsApi.update(updates);
            setSettings(res.data);
            return res.data;
        } catch (err) {
            console.error('Failed to update user settings:', err);
            throw err;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, error, refresh: fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
