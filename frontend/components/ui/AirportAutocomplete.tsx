'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Airport } from '@/lib/timezone-utils';
import airportData from '@/data/airports.json';
import { MapPin, Plane } from 'lucide-react';

interface AirportAutocompleteProps {
  value: string;
  onChange: (airport: Airport | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Airport autocomplete component with timezone support.
 * Searches through a curated list of airports and allows selection.
 * Automatically provides timezone information for the selected airport.
 */
export function AirportAutocomplete({
  value,
  onChange,
  placeholder = 'Search airport or IATA code...',
  className = '',
  disabled = false,
}: AirportAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load airports from JSON
  const airports = useMemo(() => airportData.airports as Airport[], []);

  // Filter airports based on query
  const filteredAirports = useMemo(() => {
    if (!query || query.length < 2) return [];

    const searchLower = query.toLowerCase();
    return airports
      .filter(airport => {
        return (
          airport.iata.toLowerCase().includes(searchLower) ||
          airport.name.toLowerCase().includes(searchLower) ||
          airport.city.toLowerCase().includes(searchLower) ||
          airport.country.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 8); // Limit to 8 results
  }, [query, airports]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when value prop changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(value || '');
  }, [value]);

  const handleSelect = (airport: Airport) => {
    setQuery(airport.iata);
    setIsOpen(false);
    onChange(airport);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredAirports.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredAirports[selectedIndex]) {
          handleSelect(filteredAirports[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full pl-10 pr-3 py-2.5 shadow-xs placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
        <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>

      {/* Dropdown */}
      {isOpen && filteredAirports.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredAirports.map((airport, index) => (
            <button
              key={airport.iata}
              type="button"
              onClick={() => handleSelect(airport)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors ${
                index === selectedIndex ? 'bg-primary-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-sm">
                      {airport.iata}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">
                    {airport.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">
                      {airport.city}
                      {airport.state && `, ${airport.state}`}
                      {', '}
                      {airport.country}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {airport.timezone}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && filteredAirports.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500">
          No airports found for &quot;{query}&quot;
          <div className="text-xs text-slate-400 mt-1">
            Try searching by IATA code (e.g., LAX, JFK) or city name
          </div>
        </div>
      )}

      {/* Helper text */}
      {!isOpen && query.length < 2 && (
        <div className="text-xs text-slate-500 mt-1">
          Type 2+ characters to search airports
        </div>
      )}
    </div>
  );
}

/**
 * Display selected airport with timezone info
 */
interface AirportDisplayProps {
  airportCode: string;
  timezone?: string;
  className?: string;
}

export function AirportDisplay({ airportCode, timezone, className = '' }: AirportDisplayProps) {
  const airports = useMemo(() => airportData.airports as Airport[], []);
  const airport = airports.find(a => a.iata === airportCode);

  if (!airport && !timezone) {
    return (
      <div className={`text-sm text-slate-600 ${className}`}>
        {airportCode}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="font-medium text-slate-900">{airportCode}</div>
      {(airport || timezone) && (
        <div className="text-xs text-slate-500 mt-0.5">
          {airport ? (
            <>
              {airport.city}, {airport.country}
              <span className="text-slate-400 ml-2">{airport.timezone}</span>
            </>
          ) : (
            <span className="text-slate-400">{timezone}</span>
          )}
        </div>
      )}
    </div>
  );
}
