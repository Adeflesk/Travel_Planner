# Travel Planner Design System

This document outlines the design direction, color palette, layout principles, and implementation plan for the Travel Planner application.

## Detailed Specifications

| Document | Description |
|----------|-------------|
| [01-colors.md](./01-colors.md) | Complete color palette, semantic colors, transport modes, accessibility |
| [02-typography.md](./02-typography.md) | Font families, type scale, text styles, responsive typography |
| [03-components.md](./03-components.md) | Buttons, cards, badges, forms, modals, tabs, loading states |
| [04-layout.md](./04-layout.md) | Spacing, grid system, page layouts, responsive patterns |

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Color Palette](#color-palette)
- [Typography](#typography)
- [Layout Principles](#layout-principles)
- [Component Guidelines](#component-guidelines)
- [Dashboard Design](#dashboard-design)
- [Implementation Plan](#implementation-plan)

---

## Design Philosophy

### Core Principles

1. **Adventurous yet Trustworthy** - Travel is exciting, but users need to trust the app with their plans
2. **Information at a Glance** - Surface the most important info without overwhelming
3. **Progressive Disclosure** - Show basics first, details on demand
4. **Mobile-First** - Many users will check their plans on the go
5. **Accessible** - WCAG 2.1 AA compliance minimum

### Design Goals

- Reduce cognitive load when planning complex trips
- Make it easy to see "what's next"
- Celebrate completed trips and progress
- Provide clear visual feedback for actions and states

---

## Color Palette

### Primary Palette (Ocean & Sunset Theme)

| Role | Color | Hex | Tailwind | Usage |
|------|-------|-----|----------|-------|
| Primary | Blue | `#2563EB` | `blue-600` | Primary actions, links, navigation |
| Primary Light | Light Blue | `#DBEAFE` | `blue-100` | Backgrounds, highlights |
| Secondary | Orange | `#F97316` | `orange-500` | CTAs, attention, adventure |
| Accent | Emerald | `#10B981` | `emerald-500` | Success, confirmations, nature |
| Warning | Amber | `#F59E0B` | `amber-500` | Warnings, pending states |
| Danger | Red | `#EF4444` | `red-500` | Errors, over budget, alerts |

### Neutral Palette

| Role | Color | Hex | Tailwind | Usage |
|------|-------|-----|----------|-------|
| Background | Slate 50 | `#F8FAFC` | `slate-50` | Page background |
| Surface | White | `#FFFFFF` | `white` | Cards, modals |
| Border | Slate 200 | `#E2E8F0` | `slate-200` | Borders, dividers |
| Text Primary | Slate 900 | `#0F172A` | `slate-900` | Headings, body text |
| Text Secondary | Slate 600 | `#475569` | `slate-600` | Secondary text |
| Text Muted | Slate 400 | `#94A3B8` | `slate-400` | Placeholders, disabled |

### Semantic Colors

#### Trip & Booking Status
```
Planned:     #3B82F6 (blue-500)    - Future, not yet booked
Booked:      #10B981 (emerald-500) - Confirmed reservations
In Progress: #F97316 (orange-500)  - Currently happening
Completed:   #6B7280 (gray-500)    - Past trips
Cancelled:   #EF4444 (red-500)     - Cancelled items
```

#### Transport Modes
```
Flight:      #0EA5E9 (sky-500)     - Air travel
Train:       #8B5CF6 (violet-500)  - Rail travel
Car:         #F59E0B (amber-500)   - Road trips
Bus:         #22C55E (green-500)   - Bus travel
Ferry:       #06B6D4 (cyan-500)    - Sea travel
Walk:        #78716C (stone-500)   - Walking
```

#### Budget Status
```
Under Budget:    #10B981 (emerald-500) - < 75% used
Near Budget:     #F59E0B (amber-500)   - 75-90% used
At Limit:        #F97316 (orange-500)  - 90-100% used
Over Budget:     #EF4444 (red-500)     - > 100% used
```

### CSS Custom Properties

```css
:root {
  /* Primary */
  --color-primary: #2563EB;
  --color-primary-light: #DBEAFE;
  --color-primary-dark: #1D4ED8;

  /* Secondary */
  --color-secondary: #F97316;
  --color-secondary-light: #FED7AA;

  /* Semantic */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-info: #0EA5E9;

  /* Neutrals */
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-text: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;

  /* Status */
  --color-planned: #3B82F6;
  --color-booked: #10B981;
  --color-in-progress: #F97316;
  --color-completed: #6B7280;

  /* Transport */
  --color-flight: #0EA5E9;
  --color-train: #8B5CF6;
  --color-car: #F59E0B;
  --color-bus: #22C55E;
  --color-ferry: #06B6D4;
  --color-walk: #78716C;
}
```

Design tokens are implemented in `frontend/styles/design-tokens.css` and imported by `frontend/app/globals.css`.

---

## Typography

### Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 2.25rem (36px) | 700 | 1.2 |
| H2 | 1.875rem (30px) | 600 | 1.3 |
| H3 | 1.5rem (24px) | 600 | 1.4 |
| H4 | 1.25rem (20px) | 600 | 1.4 |
| Body | 1rem (16px) | 400 | 1.5 |
| Small | 0.875rem (14px) | 400 | 1.5 |
| Caption | 0.75rem (12px) | 400 | 1.4 |

---

## Layout Principles

### Spacing Scale

Use Tailwind's default spacing scale consistently:
- `4` (1rem/16px) - Standard gap between elements
- `6` (1.5rem/24px) - Section padding
- `8` (2rem/32px) - Large section gaps

### Grid System

```
Desktop (1280px+):  12 columns, 32px gutters
Tablet (768-1279):  8 columns, 24px gutters
Mobile (<768px):    4 columns, 16px gutters
```

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVIGATION BAR (fixed, h-16)                                    │
│ Logo | Dashboard | My Trips | Templates        | User Menu     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MAIN CONTENT (max-w-7xl mx-auto px-4 sm:px-6 lg:px-8)        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ PAGE HEADER                                                │ │
│  │ Title, breadcrumbs, primary action                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ PAGE CONTENT                                               │ │
│  │                                                            │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trip Detail Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ TRIP HEADER (hero section)                                      │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Trip Name                                    [Edit] [Share] ││
│ │ Jun 10 - Jun 25, 2024 • 15 days                             ││
│ │ ████████████████████████░░░░░░░░ $3,450 / $5,000 budget    ││
│ └─────────────────────────────────────────────────────────────┘│
├────────────────────────┬────────────────────────────────────────┤
│                        │                                        │
│  SIDEBAR (w-80)        │  MAIN CONTENT                         │
│                        │                                        │
│  ┌──────────────────┐  │  ┌────────────────────────────────┐   │
│  │ Quick Stats      │  │  │ [Timeline] [Map] [List]        │   │
│  │ • 4 destinations │  │  └────────────────────────────────┘   │
│  │ • 6 journeys     │  │                                        │
│  │ • 12 activities  │  │  Timeline/Content Area                │
│  └──────────────────┘  │                                        │
│                        │                                        │
│  ┌──────────────────┐  │                                        │
│  │ Packing Progress │  │                                        │
│  │ ████████░░ 80%   │  │                                        │
│  └──────────────────┘  │                                        │
│                        │                                        │
│  ┌──────────────────┐  │                                        │
│  │ Weather Preview  │  │                                        │
│  │ Paris: 22°C ☀️   │  │                                        │
│  └──────────────────┘  │                                        │
│                        │                                        │
└────────────────────────┴────────────────────────────────────────┘
```

---

## Component Guidelines

### Cards

```
┌─────────────────────────────────────┐
│                                     │  Border: 1px slate-200
│  Card content                       │  Radius: 0.5rem (8px)
│                                     │  Shadow: sm (on hover: md)
│                                     │  Padding: 1rem (16px)
└─────────────────────────────────────┘
```

### Buttons

| Variant | Background | Text | Border | Use Case |
|---------|------------|------|--------|----------|
| Primary | blue-600 | white | none | Main actions |
| Secondary | white | slate-700 | slate-300 | Secondary actions |
| Danger | red-600 | white | none | Destructive actions |
| Ghost | transparent | slate-600 | none | Tertiary actions |

### Status Badges

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Planned │  │ Booked  │  │ Active  │  │ Done    │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
  blue-100     green-100   orange-100   gray-100
  blue-700     green-700   orange-700   gray-700
```

### Progress Bars

```
Budget Progress:
┌────────────────────────────────────────────────────────────┐
│████████████████████████████████░░░░░░░░░░░░│ 69% • $1,550  │
└────────────────────────────────────────────────────────────┘

Colors by percentage:
0-74%:   emerald-500 (green)
75-89%:  amber-500 (yellow)
90-100%: orange-500 (orange)
>100%:   red-500 (red with overflow indicator)
```

---

## Dashboard Design

### Overview

The dashboard provides a quick summary of upcoming trips, action items, and travel statistics.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Welcome back, [Name]                                          [+ New Trip] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  🌴 NEXT TRIP                   │  │  📊 YOUR STATS                  │  │
│  │                                 │  │                                 │  │
│  │  Summer Europe 2024             │  │  ✈️  12 trips planned           │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │  🌍 8 countries visited         │  │
│  │  Starts in 23 days              │  │  💰 $4,200 spent this year     │  │
│  │                                 │  │  📦 2 trips upcoming            │  │
│  │  Paris → Amsterdam → Berlin     │  │                                 │  │
│  │                                 │  │                                 │  │
│  │  Budget: $3,450 / $5,000        │  │                                 │  │
│  │  ████████████████░░░░░ 69%      │  │                                 │  │
│  │                                 │  │                                 │  │
│  │  [View Trip →]                  │  │  [View All Stats →]             │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ⚡ ACTION ITEMS                                                       │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ ⚠️  Book flight to Amsterdam                    Due in 7 days   │  │ │
│  │  │     Summer Europe 2024                          [Book Now →]    │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 📦 Start packing for Europe                    0/24 items       │  │ │
│  │  │     Summer Europe 2024                          [View List →]   │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 🚨 Transportation over budget                   +$200 (120%)    │  │ │
│  │  │     Summer Europe 2024                          [Review →]      │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Recent Trips                                              [View All →]    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌─────────────┐ │
│  │ 🇯🇵             │ │ 🇬🇧             │ │ 🇲🇽             │ │             │ │
│  │ Japan 2024     │ │ London 2024    │ │ Mexico 2023    │ │  + New      │ │
│  │ May 1-15       │ │ Mar 10-17      │ │ Dec 20-30      │ │    Trip     │ │
│  │ ✓ Completed    │ │ ✓ Completed    │ │ ✓ Completed    │ │             │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └─────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Data Requirements

```typescript
interface DashboardData {
  user: {
    name: string;
  };
  nextTrip: {
    id: number;
    name: string;
    startDate: string;
    daysUntil: number;
    destinations: string[];
    budgetUsed: number;
    budgetTotal: number;
  } | null;
  stats: {
    totalTrips: number;
    countriesVisited: number;
    spentThisYear: number;
    upcomingTrips: number;
  };
  actionItems: Array<{
    type: 'booking' | 'packing' | 'budget' | 'deadline';
    title: string;
    tripName: string;
    tripId: number;
    urgency: 'low' | 'medium' | 'high';
    detail: string;
  }>;
  recentTrips: Array<{
    id: number;
    name: string;
    dates: string;
    status: 'completed' | 'in_progress';
    countryCode?: string;
  }>;
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### 1.1 Design Tokens
- [ ] Create `frontend/styles/design-tokens.css` with CSS custom properties
- [ ] Update `tailwind.config.js` to extend theme with design tokens
- [ ] Document color usage in Storybook or style guide

#### 1.2 Base Component Updates
- [ ] Update Button component with variants (primary, secondary, danger, ghost)
- [ ] Create Badge component for status indicators
- [ ] Create ProgressBar component with color thresholds
- [ ] Update Card component with consistent styling

### Phase 2: Dashboard (Week 3-4)

#### 2.1 Backend API
- [ ] Create `GET /api/dashboard` endpoint
- [ ] Implement dashboard data aggregation service
- [ ] Add action items logic (unbooked journeys, packing status, budget alerts)

#### 2.2 Frontend Dashboard
- [ ] Create `frontend/app/dashboard/page.tsx`
- [ ] Create dashboard components:
  - [ ] `DashboardHeader.tsx`
  - [ ] `NextTripCard.tsx`
  - [ ] `StatsCard.tsx`
  - [ ] `ActionItemsList.tsx`
  - [ ] `RecentTripsGrid.tsx`
- [ ] Update navigation to include Dashboard link
- [ ] Set dashboard as default landing page for logged-in users

### Phase 3: Trip Detail Redesign (Week 5-6)

#### 3.1 Layout Updates
- [ ] Implement sidebar + main content layout
- [ ] Create trip header hero section with budget progress
- [ ] Add sidebar summary cards (stats, packing, weather preview)

#### 3.2 Component Enhancements
- [ ] Update JourneyItem with transport mode colors
- [ ] Add status badges to all list items
- [ ] Implement collapsible sections for dense content

### Phase 4: Polish & Refinement (Week 7-8)

#### 4.1 Visual Polish
- [ ] Add hover states and transitions
- [ ] Implement loading skeletons
- [ ] Create empty state illustrations
- [ ] Add subtle animations for state changes

#### 4.2 Responsive Design
- [ ] Test and fix mobile layouts
- [ ] Implement touch-friendly interactions
- [ ] Optimize for tablet view

#### 4.3 Accessibility
- [ ] Audit color contrast ratios
- [ ] Add ARIA labels to interactive elements
- [ ] Test keyboard navigation
- [ ] Test with screen readers

---

## File Structure

```
frontend/
├── styles/
│   ├── design-tokens.css      # CSS custom properties
│   └── globals.css            # Global styles (updated)
├── components/
│   ├── ui/                    # Base UI components
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── ProgressBar.tsx
│   │   └── index.ts
│   ├── dashboard/             # Dashboard components
│   │   ├── DashboardHeader.tsx
│   │   ├── NextTripCard.tsx
│   │   ├── StatsCard.tsx
│   │   ├── ActionItemsList.tsx
│   │   ├── RecentTripsGrid.tsx
│   │   ├── useDashboard.ts
│   │   └── index.ts
│   └── ...existing components
├── app/
│   ├── dashboard/
│   │   └── page.tsx           # Dashboard page
│   └── ...existing pages
└── lib/
    └── types.ts               # Add DashboardData types
```

---

## Next Steps

1. **Review & Approve** - Get stakeholder approval on color palette and layout
2. **Create Feature Specs** - Document dashboard as feature 020
3. **Start Phase 1** - Begin with design tokens and base components
4. **Iterate** - Gather feedback and refine as implementation progresses

---

## Related Documents

- [Feature 017: Weather Integration](../features/017-weather-integration.md)
- [Feature 018: Budget Alerts](../features/018-budget-alerts.md)
- [Feature 019: Trip Templates](../features/019-trip-templates.md)
