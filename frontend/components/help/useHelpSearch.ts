'use client';

import { useState, useEffect, useRef } from 'react';
import { searchHelpContent, SearchResult } from '@/lib/help-content';

export function useHelpSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Handle empty or short queries
    if (!query || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Set loading state and schedule search
    setIsSearching(true);
    timerRef.current = setTimeout(() => {
      const searchResults = searchHelpContent(query);
      setResults(searchResults);
      setIsSearching(false);
    }, 300); // Debounce 300ms

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query]);

  return { results, loading: isSearching };
}
