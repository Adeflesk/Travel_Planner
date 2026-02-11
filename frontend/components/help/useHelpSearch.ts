'use client';

import { useState, useEffect } from 'react';
import { searchHelpContent, SearchResult } from '@/lib/help-content';

export function useHelpSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
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
    };
  }, [query]);

  return { results, loading };
}
