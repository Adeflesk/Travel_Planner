# Frontend `lib/` Unit Test Plan

**Date:** 2026-02-24  
**Status:** Planning  
**Author:** Antigravity

---

## 1. Why this matters

The files in `frontend/lib/` contain pure (or near-pure) helper functions that are used across **every page and component**. Bugs in them (e.g., wrong timezone offset calculation, bad currency conversion) are silent — they only surface as incorrect numbers or broken forms. Unit tests here give maximum safety for minimum effort.

Files in scope:

| File | Primary concerns |
|---|---|
| `datetime-utils.ts` | ISO string arithmetic, form ↔ ISO round-trips |
| `timezone-utils.ts` | Timezone validation, duration calc, formatting |
| `currency-utils.ts` | Conversion across currencies, formatting |
| `date-constraints.ts` | Min/max/default datetime constraint logic for forms |
| `segment-templates.ts` | Journey template structure correctness |

Files **not** in scope for unit tests (they are integration/E2E concerns):
- `api.ts` — requires a live HTTP server; covered by backend pytest + Playwright
- `auth-context.tsx`, `settings-context.tsx`, `trip-context.tsx` — React context; covered by component tests or E2E
- `help-content.ts` — pure data, no logic
- `hooks/` — covered by component tests with React Testing Library

---

## 2. Test runner choice — Vitest

We will use **Vitest** rather than Jest because:
- Natively supports TypeScript and ESM (no Babel config)  
- Shares the same globals API as Jest (`describe`, `it`, `expect`) — almost zero migration cost later
- Fast (~3× faster than Jest for pure TS files)
- Works perfectly alongside Playwright; they run completely independently

Companion libs:
- **`@vitest/ui`** — optional browser UI for watching tests
- No jsdom needed for pure utility tests (only needed later for React component tests)

---

## 3. Setup steps

### 3.1 Install

```bash
cd frontend
npm install --save-dev vitest @vitest/ui
```

### 3.2 Add `vitest.config.ts`

```ts
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],   // resolves @/ imports
  test: {
    environment: 'node',         // pure utils don't need a DOM
    globals: true,               // describe/it/expect without imports
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts', 'lib/**/*.test.ts'],
  },
});
```

> **`vite-tsconfig-paths`** is also a dev dep (`npm i -D vite-tsconfig-paths`).

### 3.3 Add npm scripts to `package.json`

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:unit:ui": "vitest --ui"
```

### 3.4 Test file location

Place test files co-located with the source, using the `.test.ts` suffix:

```
frontend/lib/
  datetime-utils.ts
  datetime-utils.test.ts      ← new
  timezone-utils.ts
  timezone-utils.test.ts      ← new
  currency-utils.ts
  currency-utils.test.ts      ← new
  date-constraints.ts
  date-constraints.test.ts    ← new
  segment-templates.ts
  segment-templates.test.ts   ← new
```

---

## 4. Test cases per file

---

### 4.1 `datetime-utils.test.ts`

**Functions:** `addHoursToISO`, `defaultEndTime`, `toDatetimeLocal`, `fromDatetimeLocal`

```
addHoursToISO
  ✓ adds 2 hours to an ISO string
  ✓ handles hour overflow into next day (e.g. 23:00 + 2h → next day 01:00)
  ✓ handles negative hours (subtraction)
  ✓ preserves timezone offset in output

defaultEndTime
  ✓ defaults to 2 hours after start
  ✓ accepts a custom duration

toDatetimeLocal
  ✓ converts "2026-06-01T14:30:00Z" → "2026-06-01T14:30"
  ✓ returns '' for undefined input
  ✓ returns '' for an invalid ISO string

fromDatetimeLocal
  ✓ converts "2026-06-01T09:00" → a valid ISO string
  ✓ returns undefined for empty string
  ✓ returns undefined for a non-date string
```

---

### 4.2 `timezone-utils.test.ts`

**Functions:** `isValidTimezone`, `sanitizeTimezone`, `ensureUTC`, `formatDuration`, `formatDurationLong`, `calculateFlightDuration`, `getTimezoneOffsetDifference`, `formatTimezoneDifference`, `parseIATACode`, `crossesMidnight`

```
isValidTimezone
  ✓ returns true for "America/New_York"
  ✓ returns true for "UTC"
  ✓ returns false for "USA"  (country code, not IANA)
  ✓ returns false for ""
  ✓ returns false for null/undefined

sanitizeTimezone
  ✓ passes through valid IANA tz
  ✓ returns undefined for invalid

ensureUTC
  ✓ appends Z to bare datetime string
  ✓ does not modify a string already ending in Z
  ✓ does not modify a string with offset "+05:30"

formatDuration
  ✓ 0 → "0m"
  ✓ 45 → "45m"
  ✓ 60 → "1h"
  ✓ 90 → "1h 30m"
  ✓ 125 → "2h 5m"
  ✓ negative → "0m"

formatDurationLong
  ✓ 1 minute → "1 minute"
  ✓ 2 hours → "2 hours"
  ✓ 90 → "1 hour 30 minutes"

calculateFlightDuration
  ✓ calculates same-timezone duration correctly
  ✓ NYC to LAX: departure 08:00 ET, arrival 11:00 PT → 360 minutes
  ✓ returns 0 if arrival is before departure (malformed data)

getTimezoneOffsetDifference
  ✓ America/Los_Angeles vs America/New_York → 3 hours
  ✓ same timezone → 0

formatTimezoneDifference
  ✓ LA vs NY → "3 hours ahead"
  ✓ NY vs LA → "3 hours behind"
  ✓ same tz → "Same timezone"

parseIATACode
  ✓ "LAX" → "LAX"
  ✓ "lax" → "LAX"
  ✓ "LAX - Los Angeles" → "LAX"
  ✓ "(LAX)" → "LAX"
  ✓ "" → null
  ✓ "LA" → null (only 2 letters)

crossesMidnight
  ✓ same day → false
  ✓ departure evening, arrival next morning → true
```

---

### 4.3 `currency-utils.test.ts`

**Functions:** `convertCurrency`, `formatCurrency`

```
convertCurrency
  ✓ same currency (USD→USD) → returns amount unchanged
  ✓ USD → AUD with known rate → correct conversion
  ✓ AUD → EUR via USD pivot → correct
  ✓ returns null if source rate missing
  ✓ returns null if target rate missing
  ✓ handles zero amount → 0
  ✓ handles large amounts without floating-point overflow

formatCurrency
  ✓ formatCurrency(1234.5, 'USD') → "$1,234.50"
  ✓ formatCurrency(1234.5, 'AUD') → contains "A$" and "1,234.50"
  ✓ formatCurrency(0, 'EUR') → "€0.00"
```

---

### 4.4 `date-constraints.test.ts`

**Functions:** `getDateTimeConstraints`

```
getDateTimeConstraints — no options (defaults)
  ✓ sets minDateTime to start date at 00:00
  ✓ sets maxDateTime to end date at 23:59
  ✓ defaultDateTime is startDate + defaultTime (09:00)

allowBeforeStart = true
  ✓ minDateTime is undefined

allowAfterEnd = true
  ✓ maxDateTime is undefined

defaultTo = 'end'
  ✓ defaultDateTime uses endDate

defaultTo = 'today'
  ✓ defaultDateTime uses today's date (mock Date.now)

no startDate provided
  ✓ minDateTime is undefined
  ✓ defaultDateTime falls back to endDate if present

both dates undefined
  ✓ all three fields undefined

invalid date string (e.g. "not-a-date")
  ✓ treated as absent — constraints are undefined
```

---

### 4.5 `segment-templates.test.ts`

**Functions:** `createSegmentTemplate`

```
AIR_TRAVEL template
  ✓ returns exactly 3 segments
  ✓ segment types are [TRANSFER, FLIGHT, TRANSFER]
  ✓ each has origin/destination
  ✓ uses provided timezone or local fallback

AIR_LAYOVER template
  ✓ returns exactly 5 segments
  ✓ includes a LAYOVER segment at index 2

ROAD_TRIP template
  ✓ returns exactly 5 segments: LEG, STOP, LEG, STOP, LEG
  ✓ every LEG contains draft_segment_options with ≥ 1 option
  ✓ every STOP contains draft_stop_options with ≥ 1 option
  ✓ stop options have valid option_types

ROAD_TRIP_WITH_STOPS template
  ✓ returns exactly 7 segments (3 LEG + 3 STOP + 1 return LEG)

MULTI_STOP template
  ✓ returns exactly 3 segments

SIMPLE / default
  ✓ returns 1 TRANSFER segment

With startDate option
  ✓ start_datetime is set on all segments
  ✓ end_datetime is 2 hours after start_datetime

Segment order
  ✓ segments have incrementing order values starting at 0
```

---

## 5. Priority order

Build and run in this order (lowest complexity first):

1. ✅ **currency-utils** — 2 pure functions, zero deps
2. ✅ **datetime-utils** — date-fns wrappers, very predictable
3. ✅ **date-constraints** — needs `Date.now` mock for `defaultTo: 'today'`
4. ✅ **timezone-utils** — most functions, needs Intl shims but Vitest's Node environment has them
5. ✅ **segment-templates** — data-shape assertions, verify template correctness

---

## 6. Mocking strategy

| Scenario | Approach |
|---|---|
| `Date.now` / `new Date()` | `vi.setSystemTime(new Date('2026-06-01'))` in `beforeEach` |
| `Intl.DateTimeFormat` | Node 20+ has full Intl support — **no mock needed** |
| `Intl.supportedValuesOf` | Optional; only tested in `getSupportedTimezones`, which is low priority |
| `getLocalTimezone()` | Returns `Intl.DateTimeFormat().resolvedOptions().timeZone` — stable in Node 20 |

For `date-constraints.test.ts`, use **Vitest fake timers** to freeze time:

```ts
beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-06-01')));
afterEach(() => vi.useRealTimers());
```

---

## 7. CI integration

Add to GitHub Actions (if present) or just document for local:

```bash
# Run unit tests before E2E
npm run test:unit
npm run test:e2e
```

Target: **unit tests complete in < 5 seconds** (all pure logic, no network).

---

## 8. What's excluded from this plan

- **React component tests** (e.g. `DayList`, `ActivityForm`) — requires React Testing Library + jsdom; plan separately
- **`api.ts`** — integration concern, covered by backend pytest
- **Hook tests** (`useSegmentBuilder`, etc.) — requires `renderHook` from RTL; plan separately

