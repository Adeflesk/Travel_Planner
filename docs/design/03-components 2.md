# Component Specifications

This document defines the design specifications for UI components in Travel Planner.

---

## Buttons

### Button Sizes

| Size | Height | Padding | Font Size | Icon Size |
|------|--------|---------|-----------|-----------|
| Small | 32px | 12px 16px | 14px | 16px |
| Medium | 40px | 12px 20px | 14px | 18px |
| Large | 48px | 16px 24px | 16px | 20px |

### Button Variants

#### Primary Button
Main call-to-action. Use sparingly - one per section.

```
Background:   blue-600 (#2563EB)
Text:         white
Border:       none
Border Radius: 6px

Hover:
  Background: blue-700 (#1D4ED8)

Active:
  Background: blue-800 (#1E40AF)

Disabled:
  Background: slate-200 (#E2E8F0)
  Text:       slate-400 (#94A3B8)
```

```html
<button class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800
               text-white font-medium px-5 py-2.5 rounded-md
               disabled:bg-slate-200 disabled:text-slate-400
               transition-colors">
  Create Trip
</button>
```

#### Secondary Button
For secondary actions alongside primary buttons.

```
Background:   white
Text:         slate-700 (#334155)
Border:       1px solid slate-300 (#CBD5E1)
Border Radius: 6px

Hover:
  Background: slate-50 (#F8FAFC)
  Border:     slate-400

Active:
  Background: slate-100 (#F1F5F9)
```

```html
<button class="bg-white hover:bg-slate-50 active:bg-slate-100
               text-slate-700 font-medium px-5 py-2.5 rounded-md
               border border-slate-300 hover:border-slate-400
               transition-colors">
  Cancel
</button>
```

#### Danger Button
For destructive actions like delete.

```
Background:   red-600 (#DC2626)
Text:         white
Border:       none

Hover:
  Background: red-700 (#B91C1C)
```

```html
<button class="bg-red-600 hover:bg-red-700 text-white
               font-medium px-5 py-2.5 rounded-md">
  Delete Trip
</button>
```

#### Ghost Button
For tertiary actions, toolbars, icon buttons.

```
Background:   transparent
Text:         slate-600 (#475569)
Border:       none

Hover:
  Background: slate-100 (#F1F5F9)
  Text:       slate-900
```

```html
<button class="text-slate-600 hover:text-slate-900 hover:bg-slate-100
               font-medium px-3 py-2 rounded-md transition-colors">
  More Options
</button>
```

#### Link Button
Text-only button that looks like a link.

```
Background:   transparent
Text:         blue-600 (#2563EB)

Hover:
  Text:       blue-700
  Underline:  yes
```

```html
<button class="text-blue-600 hover:text-blue-700 hover:underline
               font-medium">
  View All
</button>
```

### Icon Buttons

Square buttons for icons only.

| Size | Dimensions | Icon Size |
|------|------------|-----------|
| Small | 32px x 32px | 16px |
| Medium | 40px x 40px | 20px |
| Large | 48px x 48px | 24px |

```html
<button class="p-2 rounded-md text-slate-600 hover:text-slate-900
               hover:bg-slate-100 transition-colors">
  <svg class="w-5 h-5"><!-- icon --></svg>
</button>
```

---

## Cards

### Base Card

```
Background:   white
Border:       1px solid slate-200 (#E2E8F0)
Border Radius: 8px
Shadow:       sm (0 1px 2px rgba(0,0,0,0.05))
Padding:      16px (can vary by content)

Hover (if interactive):
  Shadow:     md
  Border:     slate-300
```

```html
<div class="bg-white border border-slate-200 rounded-lg shadow-sm p-4
            hover:shadow-md hover:border-slate-300 transition-all">
  <!-- Card content -->
</div>
```

### Card with Header

```
┌─────────────────────────────────────────┐
│ Header Title                    [Action]│  ← Header: py-3 px-4, border-b
├─────────────────────────────────────────┤
│                                         │
│  Card body content                      │  ← Body: p-4
│                                         │
└─────────────────────────────────────────┘
```

```html
<div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
  <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
    <h3 class="font-semibold text-slate-900">Card Title</h3>
    <button class="text-blue-600 text-sm font-medium">Edit</button>
  </div>
  <div class="p-4">
    <!-- Body content -->
  </div>
</div>
```

### Trip Card

```
┌─────────────────────────────────────────┐
│ [UPCOMING]                              │  ← Overline badge
│                                         │
│ Summer Europe 2024                      │  ← Title: text-xl font-semibold
│ Paris, Amsterdam, Berlin                │  ← Subtitle: text-sm text-slate-600
│                                         │
│ Jun 10 - Jun 25 • 15 days               │  ← Meta info
│                                         │
│ ████████████████░░░░░░ $3,450 / $5,000  │  ← Budget progress
│                                         │
│ [View Trip]                             │  ← Action
└─────────────────────────────────────────┘
```

---

## Badges

### Status Badges

Small pill-shaped indicators for status.

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Planned | blue-100 | blue-700 | none |
| Booked | emerald-100 | emerald-700 | none |
| In Progress | orange-100 | orange-700 | none |
| Completed | slate-100 | slate-600 | none |
| Cancelled | red-100 | red-700 | none |

```
Height:       24px
Padding:      4px 10px
Font Size:    12px
Font Weight:  500
Border Radius: 9999px (full)
```

```html
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full
             text-xs font-medium bg-blue-100 text-blue-700">
  Planned
</span>

<span class="inline-flex items-center px-2.5 py-0.5 rounded-full
             text-xs font-medium bg-emerald-100 text-emerald-700">
  Booked
</span>
```

### Transport Mode Badges

```html
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
             text-xs font-medium bg-sky-100 text-sky-700">
  <svg class="w-3.5 h-3.5"><!-- plane icon --></svg>
  Flight
</span>
```

### Count Badges

Small circular indicators for counts/notifications.

```
Size:         20px x 20px (min)
Font Size:    12px
Font Weight:  600
Background:   red-500 (notifications) or slate-500 (neutral)
Text:         white
Border Radius: 9999px
```

```html
<span class="inline-flex items-center justify-center min-w-[20px] h-5
             px-1.5 rounded-full text-xs font-semibold bg-red-500 text-white">
  3
</span>
```

---

## Form Inputs

### Text Input

```
Height:       40px
Padding:      8px 12px
Font Size:    16px (prevents zoom on iOS)
Border:       1px solid slate-300
Border Radius: 6px
Background:   white

Focus:
  Border:     blue-500
  Ring:       2px blue-500/20

Error:
  Border:     red-500
  Ring:       2px red-500/20

Disabled:
  Background: slate-100
  Text:       slate-400
```

```html
<input type="text"
       class="w-full px-3 py-2 border border-slate-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              disabled:bg-slate-100 disabled:text-slate-400
              placeholder:text-slate-400" />
```

### Input with Label

```html
<div class="space-y-1">
  <label class="block text-sm font-medium text-slate-700">
    Trip Name
  </label>
  <input type="text" class="w-full px-3 py-2 border border-slate-300 rounded-md..." />
  <p class="text-xs text-slate-500">
    Give your trip a memorable name
  </p>
</div>
```

### Input with Error

```html
<div class="space-y-1">
  <label class="block text-sm font-medium text-slate-700">
    Email
  </label>
  <input type="email"
         class="w-full px-3 py-2 border border-red-500 rounded-md
                focus:ring-2 focus:ring-red-500/20" />
  <p class="text-xs text-red-600">
    Please enter a valid email address
  </p>
</div>
```

### Select / Dropdown

```html
<select class="w-full px-3 py-2 border border-slate-300 rounded-md
               bg-white focus:outline-none focus:ring-2
               focus:ring-blue-500/20 focus:border-blue-500">
  <option>Select an option</option>
  <option>Option 1</option>
</select>
```

### Checkbox

```html
<label class="flex items-center gap-2 cursor-pointer">
  <input type="checkbox"
         class="w-4 h-4 rounded border-slate-300 text-blue-600
                focus:ring-blue-500/20" />
  <span class="text-sm text-slate-700">Remember me</span>
</label>
```

### Radio

```html
<label class="flex items-center gap-2 cursor-pointer">
  <input type="radio" name="option"
         class="w-4 h-4 border-slate-300 text-blue-600
                focus:ring-blue-500/20" />
  <span class="text-sm text-slate-700">Option 1</span>
</label>
```

---

## Progress Bars

### Budget Progress Bar

```
Height:       8px
Border Radius: 4px (full)
Background:   slate-200

Fill Colors (by percentage):
  0-74%:      emerald-500
  75-89%:     amber-500
  90-100%:    orange-500
  >100%:      red-500 (with overflow indicator)
```

```html
<!-- Under budget (green) -->
<div class="h-2 bg-slate-200 rounded-full overflow-hidden">
  <div class="h-full bg-emerald-500 rounded-full" style="width: 65%"></div>
</div>

<!-- Near budget (yellow) -->
<div class="h-2 bg-slate-200 rounded-full overflow-hidden">
  <div class="h-full bg-amber-500 rounded-full" style="width: 82%"></div>
</div>

<!-- Over budget (red with stripes) -->
<div class="h-2 bg-slate-200 rounded-full overflow-hidden">
  <div class="h-full bg-red-500 rounded-full" style="width: 100%"></div>
</div>
```

### Progress Bar with Label

```html
<div class="space-y-1">
  <div class="flex justify-between text-sm">
    <span class="font-medium text-slate-700">Budget</span>
    <span class="text-slate-600">$3,450 / $5,000</span>
  </div>
  <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
    <div class="h-full bg-emerald-500 rounded-full transition-all duration-300"
         style="width: 69%"></div>
  </div>
  <div class="flex justify-between text-xs text-slate-500">
    <span>69% used</span>
    <span>$1,550 remaining</span>
  </div>
</div>
```

---

## Modal / Dialog

```
Background:   white
Border Radius: 12px
Shadow:       xl
Max Width:    varies (sm: 384px, md: 448px, lg: 512px, xl: 576px)
Padding:      0 (use header/body/footer)

Overlay:
  Background: black/50
  Backdrop:   blur-sm (optional)
```

### Modal Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Modal Title                                             [✕] │  ← Header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Modal body content goes here. This can include forms,      │  ← Body
│  information, or any other content.                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Confirm Action]     │  ← Footer
└─────────────────────────────────────────────────────────────┘
```

```html
<!-- Overlay -->
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
  <!-- Modal -->
  <div class="fixed inset-0 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 class="text-lg font-semibold text-slate-900">Modal Title</h2>
        <button class="text-slate-400 hover:text-slate-600">
          <svg class="w-5 h-5"><!-- X icon --></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-4">
        <p class="text-slate-600">Modal content...</p>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
        <button class="...secondary">Cancel</button>
        <button class="...primary">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

---

## Tabs

### Underline Tabs

```html
<div class="border-b border-slate-200">
  <nav class="flex gap-6">
    <button class="py-3 text-sm font-medium text-blue-600
                   border-b-2 border-blue-600 -mb-px">
      Timeline
    </button>
    <button class="py-3 text-sm font-medium text-slate-500
                   hover:text-slate-700 border-b-2 border-transparent">
      Destinations
    </button>
    <button class="py-3 text-sm font-medium text-slate-500
                   hover:text-slate-700 border-b-2 border-transparent">
      Expenses
    </button>
  </nav>
</div>
```

### Pill Tabs

```html
<div class="flex gap-1 p-1 bg-slate-100 rounded-lg">
  <button class="px-4 py-2 text-sm font-medium rounded-md
                 bg-white text-slate-900 shadow-sm">
    Timeline
  </button>
  <button class="px-4 py-2 text-sm font-medium rounded-md
                 text-slate-600 hover:text-slate-900">
    Destinations
  </button>
</div>
```

---

## Lists

### Simple List

```html
<ul class="divide-y divide-slate-200">
  <li class="py-3 flex items-center justify-between">
    <span class="text-slate-900">List item</span>
    <button class="text-slate-400 hover:text-slate-600">
      <svg class="w-5 h-5"><!-- chevron --></svg>
    </button>
  </li>
</ul>
```

### List with Icons

```html
<ul class="space-y-2">
  <li class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50">
    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100
                flex items-center justify-center">
      <svg class="w-5 h-5 text-blue-600"><!-- icon --></svg>
    </div>
    <div class="flex-1 min-w-0">
      <p class="font-medium text-slate-900">Title</p>
      <p class="text-sm text-slate-500 truncate">Description text</p>
    </div>
    <span class="text-sm text-slate-400">Meta</span>
  </li>
</ul>
```

---

## Tooltips

```
Background:   slate-900
Text:         white
Font Size:    12px
Padding:      4px 8px
Border Radius: 4px
Max Width:    200px
```

```html
<div class="relative group">
  <button>Hover me</button>
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
              px-2 py-1 bg-slate-900 text-white text-xs rounded
              opacity-0 group-hover:opacity-100 transition-opacity
              pointer-events-none whitespace-nowrap">
    Tooltip text
    <div class="absolute top-full left-1/2 -translate-x-1/2
                border-4 border-transparent border-t-slate-900"></div>
  </div>
</div>
```

---

## Loading States

### Spinner

```html
<svg class="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" stroke-width="4" fill="none"></circle>
  <path class="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
</svg>
```

### Skeleton

```html
<div class="animate-pulse space-y-3">
  <div class="h-4 bg-slate-200 rounded w-3/4"></div>
  <div class="h-4 bg-slate-200 rounded w-1/2"></div>
  <div class="h-4 bg-slate-200 rounded w-5/6"></div>
</div>
```

### Button Loading State

```html
<button class="bg-blue-600 text-white px-4 py-2 rounded-md
               flex items-center gap-2" disabled>
  <svg class="animate-spin h-4 w-4"><!-- spinner --></svg>
  Saving...
</button>
```

---

## Empty States

```html
<div class="text-center py-12">
  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100
              flex items-center justify-center">
    <svg class="w-8 h-8 text-slate-400"><!-- icon --></svg>
  </div>
  <h3 class="text-lg font-medium text-slate-900 mb-1">No trips yet</h3>
  <p class="text-slate-500 mb-4">Get started by creating your first trip</p>
  <button class="bg-blue-600 text-white px-4 py-2 rounded-md">
    Create Trip
  </button>
</div>
```

---

## Transitions

### Default Transition
```css
transition: all 150ms ease-in-out;
/* Tailwind: transition-all */
```

### Color Transition
```css
transition: color 150ms ease-in-out, background-color 150ms ease-in-out;
/* Tailwind: transition-colors */
```

### Shadow Transition
```css
transition: box-shadow 150ms ease-in-out;
/* Tailwind: transition-shadow */
```

### Transform Transition
```css
transition: transform 200ms ease-out;
/* Tailwind: transition-transform duration-200 ease-out */
```
