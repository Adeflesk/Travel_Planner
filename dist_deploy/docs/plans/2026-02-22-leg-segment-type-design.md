# Design: LEG Segment Type

**Date:** 2026-02-22
**Status:** Approved
**Related feature:** Segment Builder / SegmentWizard

---

## Problem

When a user selects the "Road trip" template in the Segment Wizard, the TRANSFER segments that represent driving legs between cities show airport-transfer-oriented fields:

- Transfer mode dropdown (taxi, ride share, shuttle…)
- Airport parking checkbox
- Pickup notes / Drop-off notes

These fields make sense for "getting to/from an airport" but are wrong for a road trip leg. The segment heading also just says "TRANSFER" — giving no sense that this is a driving leg between two cities.

---

## Solution

Introduce a new `SegmentType` value: **`LEG`**

LEG represents an inter-city ground travel leg where the specific transport mode hasn't been locked in yet, or where multiple options are being compared. It is the right type for road trip legs, overland journeys, and multi-city trips that may use any combination of car, train, bus, or hired transport.

### LEG vs TRANSFER — distinction

| | TRANSFER | LEG |
|---|---|---|
| **Purpose** | Short airport/hotel/station hop | Inter-city ground travel (road trip, overland) |
| **Typical distance** | Short (within a city) | Long (city-to-city) |
| **Icon** | 🚗 | 🛣️ |
| **Color** | Amber | Teal |

---

## Type Model

Full updated `SegmentType` values:

| Type | Purpose | Icon |
|---|---|---|
| `TRANSFER` | Short airport/hotel/station transfer | 🚗 Amber |
| `LEG` *(new)* | Inter-city ground travel leg | 🛣️ Teal |
| `BUS` | Definitive bus booking | 🚌 Emerald |
| `RAIL` | Definitive train booking | 🚆 Violet |
| `FLIGHT` | Flight | ✈️ Sky |
| `LAYOVER` | Airport wait between flights | ⏸️ Slate |
| `STOP` | Rest stop / activity point | 📍 Rose |

---

## LEG Form Fields

| Field | Source |
|---|---|
| Origin / Destination | Existing (SegmentLocationInputs) |
| Start / End datetime | Existing (SegmentTimingEditor) |
| Cost / Currency / Booked / Paid | Existing (SegmentDetailsForm cost section) |
| **Mode dropdown** (drive / train / bus / ferry / ride share / hire / other) | New |
| **Route notes** (freeform text) | New |
| **Estimated distance** (optional, number field) | New |
| Transport option cards | Existing (TransportOptionCards — extended to LEG) |

Fields explicitly **not shown** for LEG:
- Airport parking checkbox
- Pickup/drop-off notes
- Provider field (covered by transport option cards)

---

## Template Changes

Road trip templates swap their TRANSFER legs for LEG:

| Template | Before | After |
|---|---|---|
| `ROAD_TRIP` | `TRANSFER → STOP → TRANSFER → STOP → TRANSFER` | `LEG → STOP → LEG → STOP → LEG` |
| `ROAD_TRIP_WITH_STOPS` | `TRANSFER → STOP → TRANSFER → STOP → TRANSFER → STOP → TRANSFER` | `LEG → STOP → LEG → STOP → LEG → STOP → LEG` |
| `MULTI_STOP` | `TRANSFER → STOP → TRANSFER` | `LEG → STOP → LEG` |

Templates unchanged:
- `AIR_TRAVEL` — `TRANSFER → FLIGHT → TRANSFER`
- `AIR_LAYOVER` — `TRANSFER → FLIGHT → LAYOVER → FLIGHT → TRANSFER`
- `SIMPLE` — `TRANSFER`

---

## Backward Compatibility

- Existing saved journeys with `segment_type = 'TRANSFER'` render exactly as before.
- No backend migration required — `segment_type` is a `String(20)` column with no enum constraint.
- 'LEG' (3 chars) fits comfortably in the column.
- Users can manually switch any segment to LEG via the type dropdown in SegmentCard.

---

## Files to Change

Frontend only:

| File | Change |
|---|---|
| `frontend/lib/types.ts` | Add `'LEG'` to `SegmentType` union |
| `frontend/components/journey-segments/SegmentWizard.tsx` | Add LEG entry to `SEG_STYLE`; update INTENT_OPTIONS chains for ROAD_TRIP, ROAD_TRIP_WITH_STOPS, MULTI_STOP |
| `frontend/components/journey-segments/SegmentCard.tsx` | Add LEG to segment type dropdown; extend `isTransportSegment` condition to include LEG |
| `frontend/components/journey-segments/SegmentDetailsForm.tsx` | Add LEG-specific section (mode dropdown, route notes, distance); LEG added to transport card condition |
| `frontend/lib/segment-templates.ts` | Swap TRANSFER → LEG in ROAD_TRIP, ROAD_TRIP_WITH_STOPS, MULTI_STOP templates; extend `buildTransportSegment` type constraint to include LEG |

No backend changes. No database migration.

---

## Verification

1. `npx tsc --noEmit` — no TypeScript errors
2. `npm run lint` — no warnings in modified files
3. Manual: Create new journey using ROAD_TRIP template → all connecting segments show as LEG with 🛣️ icon, correct teal colour, and road-trip form fields (mode, route notes, distance)
4. Manual: Existing journeys with TRANSFER segments still render correctly
5. Manual: Save a LEG segment, reload → `segment_type` persists as "LEG" in API response
6. `pytest tests/ -x -q` — backend tests unaffected
