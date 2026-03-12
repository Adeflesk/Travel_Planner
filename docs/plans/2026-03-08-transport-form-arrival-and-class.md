# Transport Form — Arrival Time & Travel Class Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two gaps in the transport form: always show the arrival time input, and add travel-class pill buttons for train, bus, and ferry (matching the seat-class pills already on flight).

**Architecture:** Pure frontend changes — no backend, no new files, no schema changes. All class values land in `extra.travel_class` (or the existing `extra.seat_class` for flights). The three tasks are independent; each ends with a lint + type-check gate before committing.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, React

---

## What's already done

The following items from the design doc are already merged to master and do **not** need to be touched:

- `TransportLocationSearch.tsx` — Mapbox autocomplete, category-filtered, timezone resolution
- Backend `/timezone` endpoint, `timezonefinder` dep, schema fields, migrations
- Duration badge in `TransportForm` and `TransportItem`
- Flight seat-class pills in `TransportForm`
- Seat-class badge in `TransportItem` (flight only, which is correct per current code)

---

## What this plan builds

| # | File | Change |
|---|---|---|
| 1 | `frontend/components/transport/TransportForm.tsx` | Move arrival time out of the overnight gate; always render it beside departure time |
| 2 | `frontend/components/transport/TransportForm.tsx` | Add travel-class pills for train, bus, ferry |
| 3 | `frontend/components/transport/TransportItem.tsx` | Show travel-class badge for train, bus, ferry |

---

## Task 1: Always show arrival time in TransportForm

**Context:** Currently `TransportForm.tsx` renders the arrival time input in two gated blocks:
- Lines 332-348: only when `overnight && cfg.overnightSupported`
- Lines 350-356: only when `!cfg.overnightSupported` (drive)

This means for a train or bus where overnight is NOT checked, the arrival time input is hidden entirely. The fix is to always show departure + arrival time together, unconditionally.

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`

---

**Step 1: Locate the time rendering section**

Read `frontend/components/transport/TransportForm.tsx` lines 232–356 to confirm the exact structure before editing.

---

**Step 2: Replace the time blocks**

Find the **"Departure day + time"** grid (currently 2-column: day | dep-time) and expand it to a 3-column grid: departure day | departure time | arrival time. Then delete the two gated arrival-time blocks (the `{overnight && ...}` block and the `{!cfg.overnightSupported && ...}` block).

Replace this block:

```tsx
{/* Departure day + time */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Departure day</label>
    <select
      className={inputCls}
      value={depDayId}
      onChange={e => {
        const newDepId = e.target.value;
        setDepDayId(newDepId);
        if (overnight && newDepId) {
          advanceArrToNextDay(newDepId);
        }

        // Smart pre-fill origin from linked destination
        if (newDepId && destinations) {
          const depDay = tripDays.find(d => d.id === parseInt(newDepId, 10));
          if (depDay?.destination_id) {
            const dest = destinations.find(d => d.id === depDay.destination_id);
            if (dest) {
              const label = dest.name + (dest.country ? `, ${dest.country}` : '');
              setOrigin(label);
              setPrefilledOrigin(label);
              if (dest.latitude != null && dest.longitude != null) {
                setOriginCoords({ lat: dest.latitude, lng: dest.longitude });
              } else {
                setOriginCoords(null);
              }
            }
          }
        }
      }}
    >
      <option value="">— none —</option>
      {tripDays.map(d => (
        <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
      ))}
    </select>
  </div>
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Departure time</label>
    <input className={inputCls} type="time" value={depTime} onChange={e => setDepTime(e.target.value)} />
  </div>
</div>
```

With:

```tsx
{/* Departure day + departure time + arrival time */}
<div className="grid grid-cols-3 gap-3">
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Departure day</label>
    <select
      className={inputCls}
      value={depDayId}
      onChange={e => {
        const newDepId = e.target.value;
        setDepDayId(newDepId);
        if (overnight && newDepId) {
          advanceArrToNextDay(newDepId);
        }

        // Smart pre-fill origin from linked destination
        if (newDepId && destinations) {
          const depDay = tripDays.find(d => d.id === parseInt(newDepId, 10));
          if (depDay?.destination_id) {
            const dest = destinations.find(d => d.id === depDay.destination_id);
            if (dest) {
              const label = dest.name + (dest.country ? `, ${dest.country}` : '');
              setOrigin(label);
              setPrefilledOrigin(label);
              if (dest.latitude != null && dest.longitude != null) {
                setOriginCoords({ lat: dest.latitude, lng: dest.longitude });
              } else {
                setOriginCoords(null);
              }
            }
          }
        }
      }}
    >
      <option value="">— none —</option>
      {tripDays.map(d => (
        <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
      ))}
    </select>
  </div>
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Departure time</label>
    <input className={inputCls} type="time" value={depTime} onChange={e => setDepTime(e.target.value)} />
  </div>
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
    <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
  </div>
</div>
```

---

**Step 3: Remove the two gated arrival-time blocks**

Delete the entire overnight-gated arrival block:

```tsx
{/* Arrival day picker — only when overnight is on */}
{overnight && cfg.overnightSupported && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Arrival day</label>
      <select className={inputCls} value={arrDayId} onChange={e => setArrDayId(e.target.value)}>
        <option value="">— none —</option>
        {tripDays.map(d => (
          <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
      <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
    </div>
  </div>
)}

{/* Drive: always show arrival time inline */}
{!cfg.overnightSupported && (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
    <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
  </div>
)}
```

Replace with just the arrival day picker (still gated on overnight, since the time input moved up):

```tsx
{/* Arrival day picker — only when overnight is on */}
{overnight && cfg.overnightSupported && (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Arrival day</label>
    <select className={inputCls} value={arrDayId} onChange={e => setArrDayId(e.target.value)}>
      <option value="">— none —</option>
      {tripDays.map(d => (
        <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
      ))}
    </select>
  </div>
)}
```

---

**Step 4: Run lint + type check**

```bash
cd /Users/adriancorsini/Development/Travel_Planner/frontend
npm run lint && npx tsc --noEmit
```

Expected: no errors.

---

**Step 5: Commit**

```bash
git add frontend/components/transport/TransportForm.tsx
git commit -m "feat: always show arrival time input in transport form"
```

---

## Task 2: Add travel-class pills for train, bus, and ferry

**Context:** `TransportForm.tsx` has seat-class pills gated on `type === 'flight'`, stored in `extra.seat_class`. Train, bus, and ferry need the same treatment under a separate `extra.travel_class` key with their own option sets.

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`

---

**Step 1: Add the travel-class state**

After the existing `seatClass` state declaration (around line 93), add:

```tsx
const TRAVEL_CLASS_OPTIONS: Partial<Record<TransportType, string[]>> = {
  train: ['2nd Class', '1st Class', 'Business'],
  bus: ['Standard', 'Comfort', 'Premium'],
  ferry: ['Deck', 'Cabin', 'Business'],
};

const [travelClass, setTravelClass] = useState<string>(
  (initialData?.extra?.travel_class as string) ?? ''
);
```

Note: `travelClass` initialises to `''`. We'll default to the first option of the current type at render time (see step 2), and reset it when the type changes (step 3).

---

**Step 2: Persist travel class in handleSubmit**

In `handleSubmit`, after `if (type === 'flight' && seatClass) extra.seat_class = seatClass;`, add:

```tsx
const travelClassOptions = TRAVEL_CLASS_OPTIONS[type];
if (travelClassOptions && (travelClass || travelClassOptions[0])) {
  extra.travel_class = travelClass || travelClassOptions[0];
}
```

---

**Step 3: Reset travel class when transport type changes**

Update the type selector button's `onClick` handler from:

```tsx
onClick={() => setType(t.value)}
```

To:

```tsx
onClick={() => {
  setType(t.value);
  setTravelClass('');
}}
```

---

**Step 4: Render the travel-class pills**

Find the existing seat class block:

```tsx
{/* Seat class — flights only */}
{type === 'flight' && (
```

Immediately after the closing `)}` of that block, add:

```tsx
{/* Travel class — train, bus, ferry */}
{TRAVEL_CLASS_OPTIONS[type] && (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-2">Travel class</label>
    <div className="flex flex-wrap gap-2">
      {TRAVEL_CLASS_OPTIONS[type]!.map((cls) => {
        const active = (travelClass || TRAVEL_CLASS_OPTIONS[type]![0]) === cls;
        return (
          <button
            key={cls}
            type="button"
            onClick={() => setTravelClass(cls)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              active
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
            }`}
          >
            {cls}
          </button>
        );
      })}
    </div>
  </div>
)}
```

---

**Step 5: Run lint + type check**

```bash
cd /Users/adriancorsini/Development/Travel_Planner/frontend
npm run lint && npx tsc --noEmit
```

Expected: no errors.

---

**Step 6: Commit**

```bash
git add frontend/components/transport/TransportForm.tsx
git commit -m "feat: add travel class pills for train, bus, and ferry"
```

---

## Task 3: Show travel-class badge in TransportItem

**Context:** `TransportItem.tsx` line 40 reads `extra.seat_class` and shows it only for `transport_type === 'flight'`. Train, bus, and ferry need to read `extra.travel_class` and display their own badge.

**Files:**
- Modify: `frontend/components/transport/TransportItem.tsx`

---

**Step 1: Read travel_class from extra**

After line 40 (`const seatClass = ...`), add:

```tsx
const travelClass = transport.extra?.travel_class as string | undefined;
const classLabel = transport.transport_type === 'flight' ? seatClass : travelClass;
const showClass = ['flight', 'train', 'bus', 'ferry'].includes(transport.transport_type) && !!classLabel;
```

---

**Step 2: Replace the flight-only badge**

Find:

```tsx
{seatClass && transport.transport_type === 'flight' && (
  <span className="capitalize text-sky-600 text-xs font-medium bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
    {seatClass}
  </span>
)}
```

Replace with:

```tsx
{showClass && (
  <span className="capitalize text-sky-600 text-xs font-medium bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
    {classLabel}
  </span>
)}
```

---

**Step 3: Run lint + type check**

```bash
cd /Users/adriancorsini/Development/Travel_Planner/frontend
npm run lint && npx tsc --noEmit
```

Expected: no errors.

---

**Step 4: Commit**

```bash
git add frontend/components/transport/TransportItem.tsx
git commit -m "feat: show travel class badge for train, bus, and ferry in transport item"
```

---

## Final verification

After all three tasks, do a quick manual smoke-test in the browser (`npm run dev`):

1. Add a **flight** — seat class pills appear, arrival time visible from the start
2. Add a **train** — travel class shows "2nd Class / 1st Class / Business", arrival time visible
3. Add a **bus** — travel class shows "Standard / Comfort / Premium", arrival time visible
4. Add a **ferry** — travel class shows "Deck / Cabin / Business", arrival time visible
5. Add a **drive** — no class pills, arrival time still visible
6. Toggle overnight on a train — arrival day picker appears, arrival time already shown above
7. Save a train with "1st Class" — badge appears on the transport item
