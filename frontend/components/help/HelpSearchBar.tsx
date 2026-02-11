'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { useHelpSearch } from './useHelpSearch';

interface HelpSearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
}

export function HelpSearchBar({ placeholder = 'Search help guides...', autoFocus = false }: HelpSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { results, loading } = useHelpSearch(query);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          navigateToGuide(results[selectedIndex].guide.path);
        } else if (results.length > 0) {
          navigateToGuide(results[0].guide.path);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        inputRef.current?.blur();
        break;
    }
  };

  const navigateToGuide = (path: string) => {
    router.push(path);
    setQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && query.length >= 2 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
        >
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.guide.id}
                  onClick={() => navigateToGuide(result.guide.path)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                    index === selectedIndex ? 'bg-slate-100' : ''
                  }`}
                >
                  <div className="font-medium text-slate-900">{result.guide.title}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{result.guide.description}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {result.guide.category}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              No guides found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
