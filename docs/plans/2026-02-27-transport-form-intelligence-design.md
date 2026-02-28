# Transport Form Intelligence Design

**Date:** 2026-02-27
**Status:** Approved
**Extends:** [Transport Redesign](2026-02-27-transport-redesign-design.md)

---

## Overview

Make `TransportForm.tsx` context-aware. The form adapts its fields, labels, and placeholders based on transport type. Overnight transport is opt-in via a toggle (hidden by default), with an auto-detect nudge when times imply overnight travel. The trip creation wizard infers overnight legs from itinerary dates and prompts to confirm.

---

## Approach: Config-Driven Form

A single `TRANSPORT_CONFIG` object keyed by transport type drives all field visibility, labels, and placeholders. `TransportForm.tsx` reads from the config — no per-type conditional logic scattered through JSX.

```typescript
type TransportFieldConfig = {
  showCarrier: boolean
  carrierLabel?: string
  carrierPlaceholder?: string
  showReference: boolean
  referenceLabel?: string
  referencePlaceholder?: string
  showDistance: boolean
  showTolls: boolean
  showFrequency: boolean
  overnightSupported: boolean
}
```

---

## Field Matrix

| Field | flight | train | bus | drive | ferry | other |
|---|---|---|---|---|---|---|
| **Carrier** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| **Carrier label** | "Airline" | "Operator" | "Operator" | — | "Operator" | "Carrier" |
| **Carrier placeholder** | "Emirates" | "Renfe" | "FlixBus" | — | "Brittany Ferries" | — |
| **Reference** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| **Reference label** | "Flight number" | "Train code" | "Booking ref" | — | "Booking ref" | "Reference" |
| **Reference placeholder** | "EK415" | "AVE 3041" | "BK-123" | — | "BF-9876" | — |
| **Distance** | ✗ | ✗ | ✗ | ✓ | ✓ optional | ✗ |
| **Tolls toggle** | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Frequency** | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Overnight toggle** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |

Drive has no carrier and no reference. It shows: origin, destination, times, distance, tolls toggle, cost, notes.

---

## Overnight Toggle

### Default state (toggle off)
- Arrival day is implicitly the same as departure day — no arrival day picker shown
- Arrival time sits next to departure time on the same row
- Form is clean and uncluttered for the common same-day case

### Toggle on ("Crosses midnight / Overnight")
- Arrival day picker appears, defaulting to departure day + 1
- Layout shows a clear departure → arrival pair with both day and time

### Auto-detect nudge
If the user enters an arrival time that is earlier than the departure time and the overnight toggle is still off, show an inline contextual prompt:

```
⚠ Arrival before departure — travelling overnight?  [Set overnight]
```

Clicking "Set overnight" flips the toggle and advances arrival day to +1. No modal — just a nudge inline below the time fields.

### Drive exception
The overnight toggle is hidden for drive. Overnight drives are uncommon enough that notes suffice.

---

## Trip Wizard Integration

### Trigger
When building an itinerary in the trip creation wizard, if a transport leg spans two consecutive days (departure day N, implied arrival day N+1), the wizard infers a potential overnight journey.

### Prompt
A non-blocking inline callout appears beneath the relevant leg on the transport/itinerary step:

```
✈ Day 1 → Day 2 detected
Looks like you're travelling overnight on this leg.
Was this an overnight flight / train / ferry?

  [Yes, overnight]   [No, same-day arrival]
```

- **Yes, overnight** → sets `overnight` flag, arrival day = departure day + 1
- **No, same-day arrival** → dismisses, keeps same-day default

### Rules
- Prompt only appears for types with `overnightSupported: true` (flight, train, bus, ferry, other) — never for drive
- One prompt per leg; multiple overnight-eligible legs each get their own callout
- No dedicated wizard step — surfaces inline within the existing transport step

---

## Config Object (TypeScript)

```typescript
export const TRANSPORT_CONFIG: Record<string, TransportFieldConfig> = {
  flight: {
    showCarrier: true,
    carrierLabel: 'Airline',
    carrierPlaceholder: 'Emirates',
    showReference: true,
    referenceLabel: 'Flight number',
    referencePlaceholder: 'EK415',
    showDistance: false,
    showTolls: false,
    showFrequency: false,
    overnightSupported: true,
  },
  train: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'Renfe',
    showReference: true,
    referenceLabel: 'Train code',
    referencePlaceholder: 'AVE 3041',
    showDistance: false,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  bus: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'FlixBus',
    showReference: true,
    referenceLabel: 'Booking ref',
    referencePlaceholder: 'BK-123',
    showDistance: false,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  drive: {
    showCarrier: false,
    showReference: false,
    showDistance: true,
    showTolls: true,
    showFrequency: false,
    overnightSupported: false,
  },
  ferry: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'Brittany Ferries',
    showReference: true,
    referenceLabel: 'Booking ref',
    referencePlaceholder: 'BF-9876',
    showDistance: true,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  other: {
    showCarrier: true,
    carrierLabel: 'Carrier',
    showReference: true,
    referenceLabel: 'Reference',
    showDistance: false,
    showTolls: false,
    showFrequency: false,
    overnightSupported: true,
  },
}
```

---

## Files Affected

### New
- `frontend/lib/transport-config.ts` — `TRANSPORT_CONFIG` + `TransportFieldConfig` type

### Modified
- `frontend/components/transport/TransportForm.tsx` — reads config, renders adaptive fields
- `frontend/components/trip-wizard/` — overnight callout on transport/itinerary step
- `frontend/lib/types.ts` — add `overnight: boolean` to `TripTransport`
- `app/models/trip_transport.py` — add `overnight: bool = False` column
- `app/schemas/trip_transport.py` — include `overnight` in schemas

---

## Acceptance Criteria

- [ ] Drive form shows no carrier, no reference, no overnight toggle
- [ ] Flight form shows "Airline" label with "Emirates" placeholder, "Flight number" with "EK415" placeholder
- [ ] Train form shows "Operator" / "Renfe", "Train code" / "AVE 3041", and frequency field
- [ ] Overnight toggle hidden by default; reveals arrival day picker (defaults to +1) when enabled
- [ ] Auto-detect nudge appears when arrival time < departure time and toggle is off
- [ ] Trip wizard shows overnight callout for flight/train/bus/ferry legs spanning consecutive days
- [ ] Drive legs never show the overnight wizard callout
- [ ] `overnight` field persisted to backend and returned in API responses
