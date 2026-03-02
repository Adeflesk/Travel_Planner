# Day Map Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Leaflet z-index bleedthrough bug and redesign DayBuilder to show the map as a sticky side panel on desktop, collapsible on mobile.

**Architecture:** A single-file change to `DayBuilder.tsx`. The fix is `isolation: isolate` on the map wrapper (contains Leaflet's z-600+ internals so they can't bleed above z-50 modals). The layout becomes a two-column CSS Grid on `lg` screens — left column holds the timeline, right column holds a sticky map panel. Mobile keeps a refreshed collapsible toggle.

**Tech Stack:** React, Tailwind CSS (existing), react-leaflet (existing). No new dependencies.

---

## Context

**Worktree:** `~/worktrees/Travel_Planner/day-map-leaflet/`
**Design doc:** `docs/plans/2026-03-01-day-map-layout-redesign.md`

**Root cause of the bug:** Leaflet's CSS assigns `z-index: 600` to `.leaflet-marker-pane` and `z-index: 700` to `.leaflet-popup-pane`. Without `isolation: isolate` on their ancestor, these values participate in the **root stacking context** — beating the ActivityForm/TransportForm modals which only use `z-50` (z-index: 50). Adding `isolate` to the map wrapper creates a local stacking context so Leaflet's z-indices stay contained.

**Only file changed:** `frontend/components/days/DayBuilder.tsx`

---

## Task 1: Rewrite DayBuilder with two-column layout + isolation fix

**Files:**
- Modify: `frontend/components/days/DayBuilder.tsx`

**Step 1: Read the current file**

Open `frontend/components/days/DayBuilder.tsx` and confirm the current structure. The key things to notice:
- Outer div: `max-w-3xl mx-auto pb-24`
- Map panel: `mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden`
- Map wrapper (when expanded): `h-72` with `<DayMap>` inside — **no `isolate`**
- Modals live inside the same outer div

**Step 2: Replace the return statement**

Replace everything from `return (` to the closing `);` with the code below. **Keep all the hook calls and state above the return unchanged.**

```tsx
    return (
        <div className="pb-24">
            {/* Two-column grid on lg+: timeline left, sticky map right */}
            <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-5 lg:items-start">

                {/* ── Left column ─────────────────────────────────────── */}
                <div className="max-w-3xl mx-auto lg:mx-0 lg:max-w-none">
                    <DayHeader
                        day={day}
                        tripId={tripId}
                        onEditDay={() => setShowEditDayModal(true)}
                        onAddActivity={openCreateForm}
                        onAddTransport={() => {
                            setSelectedTransport(null);
                            setIsTransportFormOpen(true);
                        }}
                        onDestinationChanged={onRefresh}
                    />

                    {/* Mobile-only collapsible map (hidden on lg+) */}
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden lg:hidden">
                        <button
                            onClick={toggleMap}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                            <span className="flex items-center gap-2">
                                <Map className="w-4 h-4 text-blue-500" />
                                Day Map
                            </span>
                            {mapExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {mapExpanded && (
                            <div className="h-72 isolate">
                                <DayMap
                                    day={day}
                                    destinations={destinations}
                                    activities={activities}
                                    transports={transportItems}
                                    tripContext={tripCtx?.tripContext}
                                    onActivityClick={setHighlightedActivityId}
                                />
                            </div>
                        )}
                    </div>

                    <DayTimeline
                        scheduled={scheduled}
                        unscheduled={unscheduled}
                        onEditActivity={openEditForm}
                        transportItems={transportItems}
                        currentDayId={day.id}
                        onEditTransport={openTransportEdit}
                        highlightedActivityId={highlightedActivityId}
                    />

                    {/* Transport cards below timeline */}
                    {transportItems.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Transport</h3>
                            {transportItems.map(t => (
                                <TransportItem
                                    key={t.id}
                                    transport={t}
                                    currentDayId={day.id}
                                    onEdit={openTransportEdit}
                                    onDelete={deleteTransport}
                                    onReload={reloadTransport}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right column: sticky map (desktop only) ──────────── */}
                <aside className="hidden lg:block">
                    <div
                        className="sticky top-4 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden isolate"
                        style={{ height: 'calc(100vh - 6rem)' }}
                    >
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <Map className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Day Map</span>
                        </div>
                        <div className="h-[calc(100%-45px)]">
                            <DayMap
                                day={day}
                                destinations={destinations}
                                activities={activities}
                                transports={transportItems}
                                tripContext={tripCtx?.tripContext}
                                onActivityClick={setHighlightedActivityId}
                            />
                        </div>
                    </div>
                </aside>
            </div>

            {/* ── Modals ───────────────────────────────────────────────── */}

            {/* Activity Form Modal */}
            {isFormOpen && (
                <ActivityForm
                    activity={selectedActivity || undefined}
                    dayId={day.id}
                    onSave={handleSaveActivity}
                    onClose={() => setIsFormOpen(false)}
                    onDelete={selectedActivity?.id ? handleDeleteActivity : undefined}
                />
            )}

            {/* Transport Form Modal */}
            {isTransportFormOpen && (
                <TransportForm
                    tripDays={tripDays}
                    destinations={destinations}
                    defaultDayId={day.id}
                    initialData={selectedTransport ?? undefined}
                    onSave={handleSaveTransport}
                    onDelete={selectedTransport ? handleDeleteTransport : undefined}
                    onClose={() => {
                        setIsTransportFormOpen(false);
                        setSelectedTransport(null);
                    }}
                    isSubmitting={isTransportSubmitting}
                />
            )}

            {/* Edit Day Modal */}
            {showEditDayModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">Edit Day Details</h2>
                            <button onClick={() => setShowEditDayModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <DayForm
                            initialData={{
                                date: day.date,
                                title: day.title || '',
                                location: day.location || '',
                                notes: day.notes || ''
                            }}
                            onSubmit={handleUpdateDay}
                            onCancel={() => setShowEditDayModal(false)}
                            submitLabel="Save Changes"
                            isSubmitting={isSubmitting}
                        />

                        <div className="px-6 pb-6 -mt-4">
                            <Button
                                type="button"
                                variant="danger"
                                className="w-full"
                                onClick={() => {
                                    handleDeleteDay().then(() => {
                                        window.location.href = `/trips/${day.trip_id}`;
                                    });
                                }}
                            >
                                Delete Day
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
```

**Step 3: Run lint and type check**

```bash
cd ~/worktrees/Travel_Planner/day-map-leaflet/frontend
npm run lint && npx tsc --noEmit
```

Expected: no errors. If there are import errors, ensure the existing imports at the top of the file still cover `X`, `Map`, `ChevronDown`, `ChevronUp` from `lucide-react`.

**Step 4: Manual verification checklist**

Requires both servers running:
```bash
# Terminal 1 — backend
cd ~/worktrees/Travel_Planner/day-map-leaflet
source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — frontend
cd ~/worktrees/Travel_Planner/day-map-leaflet/frontend
npm run dev
```

Open a day page (`/trips/<id>/days/<dayId>`).

Check all of these:

**Desktop (resize browser to ≥1024px):**
- [ ] Two-column layout: timeline on left, map panel on right
- [ ] Map panel has a header row ("Day Map" + map icon)
- [ ] Map panel is sticky — scroll the timeline; map stays in view
- [ ] No "Expand ▾" toggle visible on desktop
- [ ] Click "Add Activity" → ActivityForm modal renders **fully above the map** (no marker/pin visible through the modal overlay)
- [ ] Click a transport item to edit → TransportForm modal renders fully above the map
- [ ] Click "Edit Day" → Edit Day modal renders fully above the map
- [ ] Click an activity in the timeline → map pans/highlights marker (sync still works)

**Mobile (resize browser to <1024px):**
- [ ] Single column layout
- [ ] "Day Map ▾" collapsible toggle visible
- [ ] Toggle expands/collapses the map
- [ ] Preference persists on reload (localStorage)
- [ ] ActivityForm modal renders fully above the map when expanded

**Step 5: Commit**

```bash
cd ~/worktrees/Travel_Planner/day-map-leaflet
git add frontend/components/days/DayBuilder.tsx
git commit -m "feat: side-by-side map layout + z-index isolation fix

- Two-column grid on lg+ (timeline left, sticky map right)
- Mobile: collapsible toggle preserved
- Adds isolation: isolate to map wrapper to contain Leaflet's
  z-index 600-700 internals, fixing modal bleedthrough bug
- No new dependencies

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Acceptance Criteria

- [ ] `npm run lint` passes with no errors
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] Desktop: two-column layout renders correctly
- [ ] Desktop: map sticky sidebar fills viewport height
- [ ] All three modals (Activity, Transport, Edit Day) render above map on both breakpoints
- [ ] Activity ↔ marker click sync works
- [ ] Mobile collapsible toggle works, preference persists
