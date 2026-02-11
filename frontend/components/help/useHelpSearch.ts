'use client';

import { useState, useEffect } from 'react';
import { searchHelpContent, SearchResult } from '@/lib/help-content';

export function useHelpSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Early return for empty/short queries - let state updates happen in cleanup
    if (!query || query.length < 2) {
      return;
    }

    setLoading(true);

    const timer = setTimeout(() => {
      const searchResults = searchHelpContent(query);
      setResults(searchResults);
      setLoading(false);
    }, 300); // Debounce 300ms

    return () => {
      clearTimeout(timer);
      // Clean up state when query becomes invalid
      if (!query || query.length < 2) {
        setResults([]);
        setLoading(false);
      }
    };
  }, [query]);

  // Return empty results for invalid queries without calling setState in effect body
  if (!query || query.length < 2) {
    return { results: [], loading: false };
  }

  return { results, loading };
}
