// frontend/lib/useUserSettings.ts
'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { UserSettings } from '@/lib/types';

const DEFAULTS: Partial<UserSettings> = {
  default_currency: 'USD',
  feature_flags: {},
};

export const useUserSettings = () => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    settingsApi
      .get()
      .then((res) => setSettings(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return {
    settings: settings ?? (DEFAULTS as UserSettings),
    loading,
    error,
  };
};
