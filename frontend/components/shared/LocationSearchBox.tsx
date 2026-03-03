'use client';

import { SearchBox } from '@mapbox/search-js-react';

export interface LocationSearchResult {
  text: string;
  lat: number;
  lng: number;
  country?: string;
}

interface LocationSearchBoxProps {
  value: string;
  placeholder?: string;
  onRetrieve: (result: LocationSearchResult) => void;
  onTextChange: (text: string) => void;
}

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function LocationSearchBox({
  value,
  placeholder = 'Search for a place',
  onRetrieve,
  onTextChange,
}: LocationSearchBoxProps) {
  return (
    <SearchBox
      accessToken={token}
      value={value}
      placeholder={placeholder}
      onChange={(newValue: string) => onTextChange(newValue)}
      onRetrieve={(res) => {
        const feature = res.features[0];
        if (!feature) return;

        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const text: string =
          feature.properties.name ??
          feature.properties.full_address ??
          value;
        const country: string | undefined =
          feature.properties.context?.country?.name;

        onRetrieve({ text, lat, lng, country });
      }}
      theme={{
        variables: {
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          boxShadow: 'none',
          fontFamily: 'inherit',
          unit: '0.875rem',
          padding: '0.625rem 0.75rem',
          colorBackground: '#f8fafc',
          colorText: '#0f172a',
        },
      }}
    />
  );
}
