'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserSettings } from './types';
import { settingsApi } from './api';
import { useAuth } from './auth-context';

interface SettingsContextType {
    settings: UserSettings | null;
    isLoading: boolean;
    error: string | null;
    updateSettings: (data: Partial<UserSettings>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!isAuthenticated) {
            setSettings(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const res = await settingsApi.get();
            setSettings(res.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch settings');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = async (data: Partial<UserSettings>) => {
        try {
            setError(null);
            const res = await settingsApi.update(data);
            setSettings(res.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update settings');
            throw err;
        }
    };

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                error,
                updateSettings,
                refreshSettings: fetchSettings
            }}
        >
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
