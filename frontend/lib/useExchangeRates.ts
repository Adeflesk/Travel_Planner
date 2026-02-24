// frontend/lib/useExchangeRates.ts
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export const useExchangeRates = (base = 'USD') => {
    const [rates, setRates] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get<Record<string, number>>(`/exchange-rates/?base=${base}`)
            .then((res) => setRates(res.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [base]);

    return { rates, loading, error };
};
