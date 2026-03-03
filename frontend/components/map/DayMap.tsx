'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import type { DayActivity, Destination, TripDay, TripTransport } from '@/lib/types';
import type { TripContext } from '@/lib/trip-context';
import { useGeocode } from '@/lib/useGeocode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DayMapProps {
  day: TripDay;
  destinations: Destination[];
  activities: DayActivity[];
  transports: TripTransport[];
  tripContext?: TripContext | null;
  /** Called when user clicks an activity marker */
  onActivityClick?: (activityId: number) => void;
}

interface LatLng {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function destinationIcon(name: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#2563eb;color:#fff;border:2px solid #1d4ed8;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      width:28px;height:28px;display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.4);font-size:10px;font-weight:700;
    "><span style="transform:rotate(45deg);white-space:nowrap;overflow:hidden;max-width:20px;"
    title="${name}">★</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function activityIcon(index: number, highlighted: boolean = false) {
  const bg = highlighted ? '#dc2626' : '#16a34a';
  const border = highlighted ? '#991b1b' : '#166534';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};color:#fff;border:2px solid ${border};
      border-radius:50%;width:26px;height:26px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 4px rgba(0,0,0,.35);font-size:11px;font-weight:700;
    ">${index}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

function homeBaseIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#f8fafc;color:#64748b;border:2px solid #cbd5e1;
      border-radius:50%;width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.2);font-size:16px;
    ">🏠</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Fits the map bounds to all provided points. */
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

/** Renders a single activity marker, falling back to geocoding if no stored coords. */
function ActivityMarker({
  activity,
  index,
  highlightedId,
  onActivityClick,
}: {
  activity: DayActivity;
  index: number;
  highlightedId?: number;
  onActivityClick?: (id: number) => void;
}) {
  // Use stored coords; only geocode if missing
  const needsGeocode = activity.latitude == null || activity.longitude == null;
  const { result } = useGeocode(needsGeocode ? activity.location : undefined);

  const lat = activity.latitude ?? result?.lat;
  const lng = activity.longitude ?? result?.lng;

  if (lat == null || lng == null) return null;

  const icon = activityIcon(index, highlightedId === activity.id);
  const timeLabel = activity.end_time
    ? `${activity.start_time}–${activity.end_time}`
    : activity.start_time;

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{ click: () => onActivityClick?.(activity.id) }}
    >
      <Popup>
        <div className="text-sm min-w-[140px]">
          <div className="font-semibold">{activity.title}</div>
          <div className="text-gray-500 text-xs mt-0.5">{timeLabel}</div>
          {activity.category && (
            <div className="text-xs text-blue-600 mt-0.5 capitalize">{activity.category}</div>
          )}
          {activity.location && (
            <div className="text-xs text-gray-400 mt-0.5">{activity.location}</div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DayMap({
  day,
  destinations,
  activities,
  transports,
  tripContext,
  onActivityClick,
}: DayMapProps) {
  // Destination pin — use stored coords; geocode name as fallback
  const linkedDestination = destinations.find((d) => d.id === day.destination_id);
  const storedDestCoords: LatLng | null =
    linkedDestination?.latitude != null && linkedDestination.longitude != null
      ? { lat: linkedDestination.latitude, lng: linkedDestination.longitude }
      : null;

  const destGeoQuery =
    !storedDestCoords && linkedDestination
      ? [linkedDestination.name, linkedDestination.country].filter(Boolean).join(', ')
      : undefined;
  const { result: destGeoResult } = useGeocode(destGeoQuery);

  const destCoords: LatLng | null =
    storedDestCoords ?? (destGeoResult ? { lat: destGeoResult.lat, lng: destGeoResult.lng } : null);

  // Sorted activities
  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [activities]
  );

  // Transport routes for this day
  const dayTransports = transports.filter(
    (t) =>
      (t.departure_day_id === day.id || t.arrival_day_id === day.id) &&
      t.origin_latitude != null &&
      t.origin_longitude != null &&
      t.destination_latitude != null &&
      t.destination_longitude != null
  );

  const hasActivityCoords = sortedActivities.some(
    (a) => a.latitude != null && a.longitude != null
  );
  const hasHomeBase =
    tripContext?.home_base_latitude != null && tripContext.home_base_longitude != null;
  // A linked destination is pending geocoding — don't fall back to home base yet
  const destPendingGeocode = !!linkedDestination && !destCoords;
  const hasAnyCoords = destCoords != null || hasActivityCoords;

  // No coordinates anywhere — illustrated empty state (suppress while geocoding pending)
  if (!hasAnyCoords && !hasHomeBase && !destPendingGeocode) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400 rounded-lg">
        <MapPin className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-500">No locations yet</p>
        <p className="text-xs text-center max-w-[200px]">
          Add a location to your activities to see them on the map.
        </p>
      </div>
    );
  }

  // Fallback center: destination → home_base (only if no dest linked) → world
  const fallbackCenter: LatLng = destCoords
    ?? (!destPendingGeocode && hasHomeBase
        ? { lat: tripContext!.home_base_latitude!, lng: tripContext!.home_base_longitude! }
        : { lat: 20, lng: 0 });
  const fallbackZoom = destCoords ? 12 : destPendingGeocode ? 2 : 10;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[fallbackCenter.lat, fallbackCenter.lng]}
        zoom={fallbackZoom}
        className="h-full w-full rounded-lg"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Home base marker — shown when no real activity/destination pins yet */}
        {!hasAnyCoords && hasHomeBase && (
          <Marker
            position={[tripContext!.home_base_latitude!, tripContext!.home_base_longitude!]}
            icon={homeBaseIcon()}
          >
            <Popup>
              <div className="text-sm font-semibold">{tripContext!.home_base ?? 'Home base'}</div>
              <div className="text-xs text-gray-400 mt-0.5">Your departure city</div>
            </Popup>
          </Marker>
        )}

        {/* Destination pin */}
        {destCoords && linkedDestination && (
          <Marker position={[destCoords.lat, destCoords.lng]} icon={destinationIcon(linkedDestination.name)}>
            <Popup>
              <div className="text-sm font-semibold">{linkedDestination.name}</div>
              {linkedDestination.country && (
                <div className="text-xs text-gray-500">{linkedDestination.country}</div>
              )}
            </Popup>
          </Marker>
        )}

        {/* Activity markers */}
        {sortedActivities.map((activity, i) => (
          <ActivityMarker
            key={activity.id}
            activity={activity}
            index={i + 1}
            onActivityClick={onActivityClick}
          />
        ))}

        {/* Activity route polyline */}
        <ActivityRoutePolyline activities={sortedActivities} />

        {/* Transport routes */}
        {dayTransports.map((t) => (
          <Polyline
            key={t.id}
            positions={[
              [t.origin_latitude!, t.origin_longitude!],
              [t.destination_latitude!, t.destination_longitude!],
            ]}
            pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6 4', opacity: 0.8 }}
          />
        ))}

        {/* Auto-fit bounds */}
        <BoundsController
          destCoords={destCoords}
          activities={sortedActivities}
          tripContext={tripContext}
        />
      </MapContainer>

      {/* Prompt overlay when only home base is shown */}
      {!hasAnyCoords && hasHomeBase && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm text-slate-500 text-xs px-3 py-1.5 rounded-full shadow border border-slate-200 whitespace-nowrap">
            Add locations to your activities to see them on the map
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route polyline — reads stored coords from activities only
// (geocoded fallback handled inside ActivityMarker; we don't duplicate here)
// ---------------------------------------------------------------------------

function ActivityRoutePolyline({ activities }: { activities: DayActivity[] }) {
  const points = activities
    .filter((a) => a.latitude != null && a.longitude != null)
    .map((a) => [a.latitude!, a.longitude!] as [number, number]);

  if (points.length < 2) return null;

  return (
    <Polyline
      positions={points}
      pathOptions={{ color: '#16a34a', weight: 2.5, dashArray: '8 5', opacity: 0.9 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Bounds controller — fits map to all known coords
// ---------------------------------------------------------------------------

function BoundsController({
  destCoords,
  activities,
  tripContext,
}: {
  destCoords: LatLng | null;
  activities: DayActivity[];
  tripContext?: TripContext | null;
}) {
  const points: LatLng[] = [];

  if (destCoords) points.push(destCoords);

  for (const a of activities) {
    if (a.latitude != null && a.longitude != null) {
      points.push({ lat: a.latitude, lng: a.longitude });
    }
  }

  if (points.length === 0 && tripContext?.home_base_latitude != null) {
    points.push({
      lat: tripContext.home_base_latitude,
      lng: tripContext.home_base_longitude ?? 0,
    });
  }

  return <FitBounds points={points} />;
}
