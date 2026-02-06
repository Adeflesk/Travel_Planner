# Layout Specification

This document defines the layout system, spacing, and page structures for Travel Planner.

---

## Spacing Scale

Based on a 4px base unit. Use consistently throughout the application.

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| 0 | 0 | 0px | Reset |
| 0.5 | 0.125rem | 2px | Micro spacing |
| 1 | 0.25rem | 4px | Tight spacing |
| 1.5 | 0.375rem | 6px | Icon gaps |
| 2 | 0.5rem | 8px | Small gaps |
| 3 | 0.75rem | 12px | Component internal |
| 4 | 1rem | 16px | **Standard gap** |
| 5 | 1.25rem | 20px | Medium spacing |
| 6 | 1.5rem | 24px | **Section padding** |
| 8 | 2rem | 32px | **Large gaps** |
| 10 | 2.5rem | 40px | Section margins |
| 12 | 3rem | 48px | Page sections |
| 16 | 4rem | 64px | Hero spacing |
| 20 | 5rem | 80px | Major sections |

### Common Patterns

```css
/* Component internal padding */
padding: 16px;  /* p-4 */

/* Section padding */
padding: 24px;  /* p-6 */

/* Gap between cards */
gap: 16px;  /* gap-4 */

/* Gap between sections */
gap: 32px;  /* gap-8 */

/* Page margin on mobile */
padding-x: 16px;  /* px-4 */

/* Page margin on desktop */
padding-x: 32px;  /* px-8 */
```

---

## Breakpoints

| Name | Min Width | Container Max | Usage |
|------|-----------|---------------|-------|
| xs | 0 | 100% | Mobile |
| sm | 640px | 640px | Large mobile |
| md | 768px | 768px | Tablet |
| lg | 1024px | 1024px | Small desktop |
| xl | 1280px | 1280px | Desktop |
| 2xl | 1536px | 1536px | Large desktop |

```css
/* Tailwind usage */
<div class="px-4 sm:px-6 lg:px-8">
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## Grid System

### 12-Column Grid

```
Desktop (lg+):  12 columns, 32px gutters
Tablet (md):    8 columns, 24px gutters
Mobile (sm-):   4 columns, 16px gutters
```

```html
<div class="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8">
  <div class="col-span-4 md:col-span-4 lg:col-span-6">Half width</div>
  <div class="col-span-4 md:col-span-4 lg:col-span-6">Half width</div>
</div>
```

### Common Grid Patterns

#### Two-Column Layout (Sidebar)
```html
<div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
  <aside>Sidebar (fixed 320px)</aside>
  <main>Content (flexible)</main>
</div>
```

#### Three-Column Card Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

#### Four-Column Card Grid
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div>Card</div>
  <div>Card</div>
  <div>Card</div>
  <div>Card</div>
</div>
```

---

## Page Layouts

### Base Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION BAR (fixed, h-16, z-50)                                          │
│ Logo | Dashboard | My Trips | Templates                    | User Menu     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MAIN CONTENT (min-h-[calc(100vh-64px)])                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8                           │ │
│  │                                                                        │ │
│  │  Page content here                                                     │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```html
<div class="min-h-screen bg-slate-50">
  <!-- Navigation -->
  <nav class="fixed top-0 inset-x-0 h-16 bg-white border-b border-slate-200 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
      <!-- Nav content -->
    </div>
  </nav>

  <!-- Main content with top padding for fixed nav -->
  <main class="pt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page content -->
    </div>
  </main>
</div>
```

### Navigation Bar

```
Height:       64px (h-16)
Background:   white
Border:       1px solid slate-200 (bottom)
Position:     fixed
Z-Index:      50

Logo:
  Size:       32px height
  Margin:     right 32px

Nav Links:
  Font Size:  14px
  Weight:     500
  Color:      slate-600 (inactive), slate-900 (active)
  Gap:        24px

User Menu:
  Avatar:     32px x 32px
  Dropdown:   right-aligned
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  32px   Dashboard   My Trips   Templates              [🔔] [Avatar] │
│         ←gap→  ←─────────── 24px gaps ──────────→                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Page Header

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [← Back]                                                                  │
│                                                                           │
│ Page Title                                              [Secondary] [Primary]
│ Optional subtitle or breadcrumbs                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

```html
<header class="mb-8">
  <!-- Back link (optional) -->
  <a href="#" class="inline-flex items-center gap-1 text-sm text-slate-500
                     hover:text-slate-700 mb-4">
    <svg class="w-4 h-4"><!-- arrow left --></svg>
    Back to Trips
  </a>

  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Page Title</h1>
      <p class="text-slate-500 mt-1">Optional subtitle</p>
    </div>
    <div class="flex items-center gap-3">
      <button class="...secondary">Secondary</button>
      <button class="...primary">Primary Action</button>
    </div>
  </div>
</header>
```

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Welcome back, [Name]                                          [+ New Trip] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                                 │  │                                 │  │
│  │  Next Trip Card                 │  │  Stats Card                     │  │
│  │  (flex-1, min 320px)            │  │  (flex-1, min 280px)            │  │
│  │                                 │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Action Items (full width)                                            │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Recent Trips                                              [View All →]    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────┐  │
│  │ Trip Card      │ │ Trip Card      │ │ Trip Card      │ │ + New Trip │  │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```html
<div class="space-y-8">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Welcome back, Name</h1>
    <button class="...primary">+ New Trip</button>
  </div>

  <!-- Top cards -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="...card">Next Trip</div>
    <div class="...card">Stats</div>
  </div>

  <!-- Action items -->
  <div class="...card">Action Items</div>

  <!-- Recent trips -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Recent Trips</h2>
      <a href="#" class="text-blue-600 text-sm">View All →</a>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Trip cards -->
    </div>
  </section>
</div>
```

---

## Trip Detail Layout

### Desktop (lg+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Trips                                                             │
│                                                                             │
│ TRIP HEADER                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Summer Europe 2024                                    [Edit] [⋮ More]   ││
│ │ Jun 10 - Jun 25, 2024 • 15 days                                         ││
│ │                                                                          ││
│ │ ████████████████████████░░░░░░░░ $3,450 / $5,000 (69%)                  ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
├────────────────────────┬────────────────────────────────────────────────────┤
│                        │                                                    │
│  SIDEBAR (w-80)        │  MAIN CONTENT                                     │
│                        │                                                    │
│  ┌──────────────────┐  │  ┌──────────────────────────────────────────────┐ │
│  │ Quick Stats      │  │  │ [Timeline] [Destinations] [Journeys] [...]  │ │
│  │ • 4 destinations │  │  └──────────────────────────────────────────────┘ │
│  │ • 6 journeys     │  │                                                    │
│  │ • 12 activities  │  │  Tab content area                                 │
│  └──────────────────┘  │                                                    │
│                        │                                                    │
│  ┌──────────────────┐  │                                                    │
│  │ Budget Overview  │  │                                                    │
│  │ (by category)    │  │                                                    │
│  └──────────────────┘  │                                                    │
│                        │                                                    │
│  ┌──────────────────┐  │                                                    │
│  │ Packing Progress │  │                                                    │
│  │ ████████░░ 80%   │  │                                                    │
│  └──────────────────┘  │                                                    │
│                        │                                                    │
└────────────────────────┴────────────────────────────────────────────────────┘
```

### Mobile

```
┌───────────────────────────────┐
│ ← Back                        │
│                               │
│ Summer Europe 2024            │
│ Jun 10 - Jun 25 • 15 days     │
│                               │
│ ██████████████░░░░ 69%        │
│ $3,450 / $5,000               │
│                               │
├───────────────────────────────┤
│ [Timeline] [Dest] [More ▼]    │  ← Scrollable tabs
├───────────────────────────────┤
│                               │
│  Tab content                  │
│  (full width, scrollable)     │
│                               │
│                               │
└───────────────────────────────┘
│                               │
│  [Floating: View Summary]     │  ← Bottom sheet trigger
│                               │
```

```html
<div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
  <!-- Sidebar (hidden on mobile, shown in bottom sheet) -->
  <aside class="hidden lg:block space-y-6">
    <div class="...card">Quick Stats</div>
    <div class="...card">Budget Overview</div>
    <div class="...card">Packing Progress</div>
  </aside>

  <!-- Main content -->
  <main>
    <!-- Tabs -->
    <div class="border-b border-slate-200 mb-6">
      <nav class="flex gap-6 overflow-x-auto">
        <button class="...active">Timeline</button>
        <button>Destinations</button>
        <button>Journeys</button>
        <button>Expenses</button>
        <button>Packing</button>
      </nav>
    </div>

    <!-- Tab content -->
    <div>
      <!-- Content -->
    </div>
  </main>
</div>
```

---

## List Layouts

### Trip List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ My Trips                                      [Filter ▼] [Sort ▼] [+ Trip]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Upcoming                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Trip Card                                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Trip Card                                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Past                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Trip Card                                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Destination List (in trip)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Destinations                                               [+ Destination] │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ 1 │ 🇫🇷 Paris, France                                               │  │
│  │   │ Jun 10 - Jun 14 • 4 nights                                      │  │
│  │   │ 3 activities • $850 spent                            [Edit] [⋮] │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ 2 │ 🇳🇱 Amsterdam, Netherlands                                      │  │
│  │   │ Jun 14 - Jun 18 • 4 nights                                      │  │
│  │   │ 2 activities • $620 spent                            [Edit] [⋮] │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Form Layouts

### Single Column Form

```
Max Width: 512px (max-w-lg)
Spacing:   24px between groups (space-y-6)

┌───────────────────────────────────────────────────────────┐
│ Form Title                                                │
│ Optional description                                      │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Label                                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Input                                                │ │
│  └─────────────────────────────────────────────────────┘ │
│  Helper text                                              │
│                                                           │
│  Label                                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Input                                                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────┐ ┌─────────────────┐                 │
│  │ Start Date      │ │ End Date        │  ← Two columns  │
│  └─────────────────┘ └─────────────────┘                 │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save]             │
└───────────────────────────────────────────────────────────┘
```

```html
<form class="max-w-lg space-y-6">
  <!-- Form header -->
  <div>
    <h2 class="text-xl font-semibold text-slate-900">Create Trip</h2>
    <p class="text-slate-500 mt-1">Plan your next adventure</p>
  </div>

  <!-- Single field -->
  <div class="space-y-1">
    <label class="block text-sm font-medium text-slate-700">Trip Name</label>
    <input type="text" class="w-full ..." />
    <p class="text-xs text-slate-500">Give your trip a memorable name</p>
  </div>

  <!-- Two column fields -->
  <div class="grid grid-cols-2 gap-4">
    <div class="space-y-1">
      <label class="block text-sm font-medium text-slate-700">Start Date</label>
      <input type="date" class="w-full ..." />
    </div>
    <div class="space-y-1">
      <label class="block text-sm font-medium text-slate-700">End Date</label>
      <input type="date" class="w-full ..." />
    </div>
  </div>

  <!-- Actions -->
  <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
    <button type="button" class="...secondary">Cancel</button>
    <button type="submit" class="...primary">Save</button>
  </div>
</form>
```

### Form in Modal

Same structure but constrained by modal width (max-w-md typically).

---

## Container Widths

| Name | Max Width | Usage |
|------|-----------|-------|
| xs | 320px | Small cards, tooltips |
| sm | 384px | Small modals |
| md | 448px | Medium modals, forms |
| lg | 512px | Large modals, single-column forms |
| xl | 576px | Extra large modals |
| 2xl | 672px | Wide forms |
| 3xl | 768px | Two-column forms |
| 4xl | 896px | Wide modals |
| 5xl | 1024px | Dashboard cards |
| 6xl | 1152px | Wide content |
| 7xl | 1280px | **Main content container** |

```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Page content -->
</div>
```

---

## Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Default content |
| Dropdown | 10 | Dropdown menus |
| Sticky | 20 | Sticky headers |
| Fixed | 30 | Fixed elements |
| Modal Backdrop | 40 | Modal overlay |
| Modal | 50 | Modal content |
| Popover | 60 | Popovers, tooltips |
| Toast | 70 | Toast notifications |

```html
<nav class="fixed z-30">Navigation</nav>
<div class="z-40">Modal backdrop</div>
<div class="z-50">Modal</div>
<div class="z-70">Toast</div>
```

---

## Responsive Patterns

### Show/Hide

```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="lg:hidden">Mobile only</div>
```

### Responsive Text

```html
<h1 class="text-2xl sm:text-3xl lg:text-4xl">Responsive heading</h1>
```

### Responsive Spacing

```html
<div class="p-4 sm:p-6 lg:p-8">Responsive padding</div>
<div class="gap-4 sm:gap-6 lg:gap-8">Responsive gap</div>
```

### Responsive Grid

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- Responsive columns -->
</div>
```
