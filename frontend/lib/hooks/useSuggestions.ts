'use client';

import { useState, useEffect, useCallback } from 'react';
import { suggestionApi } from '@/lib/api';

export type SuggestionType =
  | 'carriers'
  | 'locations'
  | 'expense-descriptions'
  | 'activity-names'
  | 'packing-items'
  | 'currencies';

export interface SuggestionFilters {
  category?: string;
  trip_id?: number;
}

export interface SuggestionResponse {
  suggestions: string[];
  recent?: string[];
  popular?: string[];
}

interface SuggestionCache {
  data: SuggestionResponse;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'travel_planner_suggestions_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get cached suggestions from localStorage
 */
function getCachedSuggestions(
  type: SuggestionType,
  filters?: SuggestionFilters
): SuggestionResponse | null {
  if (typeof window === 'undefined') return null;

  const cacheKey = `${CACHE_KEY_PREFIX}${type}${filters ? `_${JSON.stringify(filters)}` : ''}`;
  const cached = localStorage.getItem(cacheKey);

  if (!cached) return null;

  try {
    const parsed: SuggestionCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_TTL) {
      return parsed.data;
    }

    // Cache expired, remove it
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    // Invalid cache, remove it
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * Save suggestions to localStorage cache
 */
function setCachedSuggestions(
  type: SuggestionType,
  data: SuggestionResponse,
  filters?: SuggestionFilters
): void {
  if (typeof window === 'undefined') return;

  const cacheKey = `${CACHE_KEY_PREFIX}${type}${filters ? `_${JSON.stringify(filters)}` : ''}`;
  const cache: SuggestionCache = {
    data,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (error) {
    // Storage full or unavailable, silently fail
    console.warn('Failed to cache suggestions:', error);
  }
}

/**
 * Clear all suggestion caches
 */
export function clearSuggestionCache(): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Custom hook to fetch and cache autocomplete suggestions
 */
export function useSuggestions(
  type: SuggestionType,
  filters?: SuggestionFilters,
  enabled: boolean = true
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = getCachedSuggestions(type, filters);
    if (cached) {
      setSuggestions(cached.suggestions || []);
      setRecentItems(cached.recent || []);
      return;
    }

    // Fetch from API
    setLoading(true);
    setError(null);

    try {
      const response = await suggestionApi.getSuggestions(type, filters);
      const data = response.data;

      setSuggestions(data.suggestions || []);
      setRecentItems(data.recent || []);

      // Cache the response
      setCachedSuggestions(type, data, filters);
    } catch (err: unknown) {
      // Silently handle auth errors and network errors (user not logged in yet or server not ready)
      const isAuthError = err && typeof err === 'object' && 'response' in err &&
        err.response && typeof err.response === 'object' && 'status' in err.response &&
        (err.response.status === 401 || err.response.status === 403);

      const isNetworkError = err && typeof err === 'object' && 'message' in err &&
        typeof err.message === 'string' && err.message.includes('Network Error');

      // Only log non-auth, non-network errors
      if (!isAuthError && !isNetworkError) {
        console.error('Failed to fetch suggestions:', err);
        setError('Failed to load suggestions');
      }

      // Return empty suggestions on error (graceful degradation)
      setSuggestions([]);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  }, [type, filters, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  /**
   * Manually refresh suggestions (bypasses cache)
   */
  const refresh = useCallback(async () => {
    // Clear cache for this type
    if (typeof window !== 'undefined') {
      const cacheKey = `${CACHE_KEY_PREFIX}${type}${filters ? `_${JSON.stringify(filters)}` : ''}`;
      localStorage.removeItem(cacheKey);
    }

    // Fetch fresh data
    await fetchSuggestions();
  }, [type, filters, fetchSuggestions]);

  return {
    suggestions,
    recentItems,
    loading,
    error,
    refresh,
  };
}
