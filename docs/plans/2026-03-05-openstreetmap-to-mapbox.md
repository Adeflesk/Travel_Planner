# Plan: Migrate DayMap from OpenStreetMap to Mapbox Raster Tiles

**Date:** 2026-03-05
**Status:** ✅ Implemented
**File changed:** `frontend/components/map/DayMap.tsx`

---

## Background

`DayMap.tsx` was using OpenStreetMap (OSM) as its tile source via `react-leaflet`. While OSM is free, Mapbox tiles offer a significantly better visual quality and are consistent with the rest of the app which already uses the Mapbox SearchBox (`NEXT_PUBLIC_MAPBOX_TOKEN`).

---

## Decision: Raster Tiles (not Mapbox GL JS)

Two options were considered:

| Option | How | Billing | Verdict |
|---|---|---|---|
| **Mapbox GL JS** (`react-map-gl`) | Full engine swap, vector tiles | Per **map load** — $5/1,000 after 50k free/month | ❌ Too expensive at scale |
| **Mapbox Raster Tiles** via Leaflet | Swap `<TileLayer url>` only | Per **tile request** — ~$200 free credit/month | ✅ Chosen |

### Why Raster Tiles Win

- **Cost**: At typical travel planner usage, tile requests cost effectively $0/month. Map loads would accumulate quickly on every page view.
- **No code risk**: Leaflet, `react-leaflet`, all markers, popups, polylines, bounds fitting — everything stays the same.
- **Bundle size**: No change (Mapbox GL JS would have added ~250KB).
- **Token reuse**: Uses the existing `NEXT_PUBLIC_MAPBOX_TOKEN` already in the project.

---

## Implementation

### What Changed

Only `DayMap.tsx` was modified — 10 lines added at the top of the file.

```ts
const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '').trim();

// Mapbox Raster Tiles via Styles API — billed per tile request, not per map load.
const TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // fallback if token missing

const TILE_ATTRIBUTION = MAPBOX_TOKEN
  ? '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
```

The `<TileLayer>` in the JSX was updated to use these constants:

```tsx
<TileLayer
  attribution={TILE_ATTRIBUTION}
  url={TILE_URL}
  tileSize={256}
  zoomOffset={0}
/>
```

### What Did NOT Change

- `react-leaflet` and `leaflet` packages — kept
- All marker components (`activityIcon`, `destinationIcon`, `homeBaseIcon`)
- Popups, Polylines, `FitBounds`, `BoundsController`
- `useGeocode` hook
- `DayMapProps` interface
- All parent components rendering `<DayMap>`
- Backend — no changes

---

## Tile Style Used

`mapbox://styles/mapbox/streets-v12` — served as raster tiles at 256px resolution with `@2x` for retina displays.

Other available styles that can be swapped in by changing the URL:

| Style | URL segment |
|---|---|
| Streets (current) | `mapbox/streets-v12` |
| Outdoors (terrain) | `mapbox/outdoors-v12` |
| Light | `mapbox/light-v11` |
| Dark | `mapbox/dark-v11` |
| Satellite Streets | `mapbox/satellite-streets-v12` |

---

## Fallback Behaviour

If `NEXT_PUBLIC_MAPBOX_TOKEN` is not set or is empty after trimming, the map falls back to the original OpenStreetMap tiles automatically. No error is thrown.

---

## Environment Variables

No new env vars required. Uses the existing:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijo...
```

Ensure this is set in:
- `.env.local` (local development)
- Vercel Environment Variables (production) — **verify no trailing newline**

---

## Cost Reference

Mapbox Raster / Static Tiles API pricing (as of 2026):

| Usage | Cost |
|---|---|
| First $200/month | Free (across all Mapbox APIs) |
| Additional tile requests | ~$0.25 per 10,000 requests |

A typical session viewing a trip day map loads approximately 20–60 tiles depending on zoom level. At 1,000 daily active users, this is well within the free tier.
