'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { timezoneApi } from '@/lib/api';

const TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '').trim();
const SUGGEST_URL = 'https://api.mapbox.com/search/searchbox/v1/suggest';
const RETRIEVE_URL = 'https://api.mapbox.com/search/searchbox/v1/retrieve';

// Maps our transport types to Mapbox POI categories.
// null = no category filter (general geocoding).
const CATEGORY: Record<string, string | null> = {
  flight: 'airport',
  train: 'railway_station',
  bus: 'bus_station',
  ferry: null,          // no valid Mapbox POI category — use general geocoding
  drive: null,
  other: null,
};

interface Suggestion {
  mapbox_id: string;
  name: string;
  place_formatted: string;
}

export interface TransportLocation {
  name: string;
  lat: number;
  lng: number;
  timezone: string | null;
}

interface Props {
  transportType: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (raw: string) => void;
  onSelect: (loc: TransportLocation) => void;
}

function newSessionToken() {
  return crypto.randomUUID();
}

export function TransportLocationSearch({
  transportType,
  value,
  placeholder = 'Search…',
  required,
  onChange,
  onSelect,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const category = CATEGORY[transportType] ?? null;

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q,
          access_token: TOKEN,
          session_token: sessionToken.current,
          limit: '6',
          language: 'en',
        });
        if (category) {
          params.set('poi_category', category);
          params.set('types', 'poi');
        }
        const res = await fetch(`${SUGGEST_URL}?${params}`);
        if (!res.ok) throw new Error('suggest failed');
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = async (s: Suggestion) => {
    onChange(s.name);
    setOpen(false);
    setSuggestions([]);

    try {
      const params = new URLSearchParams({
        access_token: TOKEN,
        session_token: sessionToken.current,
      });
      const res = await fetch(`${RETRIEVE_URL}/${s.mapbox_id}?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) return;

      const [lng, lat] = feature.geometry.coordinates as [number, number];

      // Reset session token — Mapbox bills per session (suggest → retrieve)
      sessionToken.current = newSessionToken();

      // Timezone lookup — non-blocking
      let timezone: string | null = null;
      try {
        const tz = await timezoneApi.lookup(lat, lng);
        timezone = tz.data.timezone;
      } catch {
        // timezone is optional; don't block selection
      }

      onSelect({ name: s.name, lat, lng, timezone });
    } catch {
      // If retrieve fails entirely, the text value is already updated
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputCls =
    'w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin pointer-events-none" />
        ) : (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        <input
          type="text"
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={inputCls}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s.mapbox_id}
              onMouseDown={() => handleSelect(s)}
              className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                <div className="text-xs text-slate-500 truncate">{s.place_formatted}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
