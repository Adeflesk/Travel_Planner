'use client';

import { useState, useEffect } from 'react';
import { searchHelpContent, SearchResult } from '@/lib/help-content';

export function useHelpSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Handle empty or short queries - reset state asynchronously
    if (!query || query.length < 2) {
      const timer = setTimeout(() => {
        setResults([]);
        setIsSearching(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Valid query - debounce the search
    const timer = setTimeout(() => {
      setIsSearching(true);
      const searchResults = searchHelpContent(query);
      setResults(searchResults);
      setIsSearching(false);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading: isSearching };
}
