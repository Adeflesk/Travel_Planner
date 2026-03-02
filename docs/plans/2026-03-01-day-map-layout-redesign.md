# Design: Day Map Layout Redesign

**Date:** 2026-03-01
**Status:** Approved
**Branch:** day-map-leaflet worktree

---

## Problem

Two issues with the current Day Map implementation in `DayBuilder.tsx`:

### 1. Z-index clash (bug)

Leaflet's internal CSS assigns z-indices of 200–700 to its internal panes (`.leaflet-marker-pane` at 600, `.leaflet-popup-pane` at 700, etc.). Without an explicit stacking context on the map wrapper, these z-indices escape into the page's root stacking context. The ActivityForm and TransportForm modals use Tailwind `z-50` (z-index: 50), so map markers and popups visually punch through the modal overlay.

### 2. Layout UX

The current inline collapsible map sits above the timeline. When expanded, it pushes activity content down and creates an awkward relationship between the map and the add/edit activity workflow.

---

## Solution

### Fix: CSS stacking context isolation

Add the Tailwind `isolate` class (`isolation: isolate`) to the map wrapper `<div>`. This creates a new stacking context for the map. Leaflet's internal z-indices (200–700) become local to that context. The map container itself participates in the root stacking context at z-index auto, so modals at `z-50` correctly render above it.

No shadcn, no portal, no z-index escalation wars. One class.

### Layout: side-by-side on desktop

**Desktop (`lg+`):**

```
┌──────────────────────┬────────────────────┐
│ DayHeader            │ 📍 Day Map         │
├──────────────────────┤  ┌──────────────┐  │
│ ○ 09:00 Breakfast    │  │              │  │
│ ○ 11:00 Louvre       │  │  Leaflet map │  │
│ ○ 14:00 Seine Walk   │  │  (sticky,    │  │
│                      │  │  full height)│  │
│ ✈ CDG → Paris        │  └──────────────┘  │
│  [+ Add Activity]    │                    │
└──────────────────────┴────────────────────┘
```

- Outer container: `max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-5`
- Left column: DayHeader + DayTimeline + Transport cards (no map toggle on desktop)
- Right column (`<aside>`): `hidden lg:block`, child map panel is `sticky top-4`, height `calc(100vh - 6rem)`, `isolate` class applied here
- Map is always visible on desktop — no toggle needed

**Mobile (below `lg`):**

- Stack vertically (same as current)
- Collapsible map toggle is preserved, with refreshed styling
- `isolate` is applied to the mobile map wrapper too

---

## Scope

### Files changed

| File | Change |
|---|---|
| `frontend/components/days/DayBuilder.tsx` | New two-column layout; `isolate` on map wrapper; remove map toggle on desktop |

### Files unchanged

| File | Reason |
|---|---|
| `frontend/components/map/DayMap.tsx` | No change needed — the fix is in the wrapper |
| All modal components | No z-index changes needed once map is isolated |
| All other DayBuilder sub-components | No changes |

### No new dependencies

- No shadcn
- No new npm packages
- Tailwind `isolate` is already available

---

## Acceptance Criteria

- [ ] On `lg+` screens: two-column layout renders with map as right sidebar
- [ ] Map is sticky and fills viewport height while scrolling the timeline
- [ ] ActivityForm modal renders fully above the map (no marker/popup bleedthrough)
- [ ] TransportForm modal renders fully above the map
- [ ] Edit Day modal renders fully above the map
- [ ] On mobile: collapsible map toggle still works
- [ ] `highlightedActivityId` sync (click marker → highlight timeline, click timeline → pan map) still works
- [ ] `localStorage` map preference persists on mobile
- [ ] No TypeScript or lint errors
