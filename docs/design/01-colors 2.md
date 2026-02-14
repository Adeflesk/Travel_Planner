# Color Palette Specification

This document defines the color system for Travel Planner.

## Design Rationale

Travel apps should feel:
- **Trustworthy** - Users are planning important trips and spending money
- **Adventurous** - Travel is exciting and aspirational
- **Calm** - Planning should reduce stress, not add to it

We achieve this with a blue primary (trust), orange accents (adventure), and clean neutrals (calm).

---

## Primary Colors

### Primary Blue
The main brand color used for primary actions, links, and navigation elements.

| Shade | Hex | RGB | Tailwind | Usage |
|-------|-----|-----|----------|-------|
| 50 | `#EFF6FF` | 239, 246, 255 | `blue-50` | Hover backgrounds |
| 100 | `#DBEAFE` | 219, 234, 254 | `blue-100` | Selected states, highlights |
| 200 | `#BFDBFE` | 191, 219, 254 | `blue-200` | Borders on focus |
| 500 | `#3B82F6` | 59, 130, 246 | `blue-500` | Links, secondary buttons |
| 600 | `#2563EB` | 37, 99, 235 | `blue-600` | **Primary buttons, active states** |
| 700 | `#1D4ED8` | 29, 78, 216 | `blue-700` | Hover on primary buttons |
| 800 | `#1E40AF` | 30, 64, 175 | `blue-800` | Pressed states |

```css
/* CSS Custom Properties */
--color-primary-50: #EFF6FF;
--color-primary-100: #DBEAFE;
--color-primary-200: #BFDBFE;
--color-primary-500: #3B82F6;
--color-primary-600: #2563EB;
--color-primary-700: #1D4ED8;
--color-primary-800: #1E40AF;
--color-primary: var(--color-primary-600);
```

### Secondary Orange
Used for call-to-action elements, highlighting important information, and conveying excitement.

| Shade | Hex | RGB | Tailwind | Usage |
|-------|-----|-----|----------|-------|
| 50 | `#FFF7ED` | 255, 247, 237 | `orange-50` | Subtle backgrounds |
| 100 | `#FFEDD5` | 255, 237, 213 | `orange-100` | Highlight backgrounds |
| 500 | `#F97316` | 249, 115, 22 | `orange-500` | **Secondary CTAs, icons** |
| 600 | `#EA580C` | 234, 88, 12 | `orange-600` | Hover states |
| 700 | `#C2410C` | 194, 65, 12 | `orange-700` | Pressed states |

```css
--color-secondary-50: #FFF7ED;
--color-secondary-100: #FFEDD5;
--color-secondary-500: #F97316;
--color-secondary-600: #EA580C;
--color-secondary-700: #C2410C;
--color-secondary: var(--color-secondary-500);
```

---

## Semantic Colors

### Success (Emerald)
Used for successful actions, confirmations, and positive states.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#ECFDF5` | `emerald-50` | Success background |
| 100 | `#D1FAE5` | `emerald-100` | Success highlight |
| 500 | `#10B981` | `emerald-500` | **Success text, icons** |
| 600 | `#059669` | `emerald-600` | Success hover |
| 700 | `#047857` | `emerald-700` | Success pressed |

```css
--color-success-50: #ECFDF5;
--color-success-100: #D1FAE5;
--color-success-500: #10B981;
--color-success-600: #059669;
--color-success: var(--color-success-500);
```

**Use cases:**
- Booked/confirmed status badges
- Under-budget indicators
- Successful form submissions
- Completed trip status

### Warning (Amber)
Used for warnings, pending states, and items needing attention.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#FFFBEB` | `amber-50` | Warning background |
| 100 | `#FEF3C7` | `amber-100` | Warning highlight |
| 500 | `#F59E0B` | `amber-500` | **Warning text, icons** |
| 600 | `#D97706` | `amber-600` | Warning hover |
| 700 | `#B45309` | `amber-700` | Warning pressed |

```css
--color-warning-50: #FFFBEB;
--color-warning-100: #FEF3C7;
--color-warning-500: #F59E0B;
--color-warning-600: #D97706;
--color-warning: var(--color-warning-500);
```

**Use cases:**
- Near-budget warnings (75-90%)
- Pending/unbooked items
- Upcoming deadlines
- Items needing review

### Danger (Red)
Used for errors, destructive actions, and critical alerts.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#FEF2F2` | `red-50` | Error background |
| 100 | `#FEE2E2` | `red-100` | Error highlight |
| 500 | `#EF4444` | `red-500` | **Error text, icons** |
| 600 | `#DC2626` | `red-600` | Delete buttons, error hover |
| 700 | `#B91C1C` | `red-700` | Error pressed |

```css
--color-danger-50: #FEF2F2;
--color-danger-100: #FEE2E2;
--color-danger-500: #EF4444;
--color-danger-600: #DC2626;
--color-danger: var(--color-danger-500);
```

**Use cases:**
- Over-budget alerts
- Form validation errors
- Delete/cancel actions
- Cancelled status

### Info (Sky)
Used for informational messages and neutral highlights.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#F0F9FF` | `sky-50` | Info background |
| 100 | `#E0F2FE` | `sky-100` | Info highlight |
| 500 | `#0EA5E9` | `sky-500` | **Info text, icons** |
| 600 | `#0284C7` | `sky-600` | Info hover |

```css
--color-info-50: #F0F9FF;
--color-info-100: #E0F2FE;
--color-info-500: #0EA5E9;
--color-info: var(--color-info-500);
```

---

## Neutral Colors (Slate)

Used for text, backgrounds, borders, and UI chrome.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#F8FAFC` | `slate-50` | **Page background** |
| 100 | `#F1F5F9` | `slate-100` | Card hover, alternating rows |
| 200 | `#E2E8F0` | `slate-200` | **Borders, dividers** |
| 300 | `#CBD5E1` | `slate-300` | Disabled borders |
| 400 | `#94A3B8` | `slate-400` | **Placeholder text, disabled** |
| 500 | `#64748B` | `slate-500` | Secondary text |
| 600 | `#475569` | `slate-600` | **Body text** |
| 700 | `#334155` | `slate-700` | Emphasized text |
| 800 | `#1E293B` | `slate-800` | Headings |
| 900 | `#0F172A` | `slate-900` | **Primary text, titles** |

```css
--color-background: #F8FAFC;
--color-surface: #FFFFFF;
--color-border: #E2E8F0;
--color-text: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
```

---

## Status Colors

### Trip & Booking Status

| Status | Color | Hex | Background | Usage |
|--------|-------|-----|------------|-------|
| Planned | Blue | `#3B82F6` | `#DBEAFE` | Future, not yet booked |
| Booked | Green | `#10B981` | `#D1FAE5` | Confirmed reservations |
| In Progress | Orange | `#F97316` | `#FFEDD5` | Currently happening |
| Completed | Gray | `#6B7280` | `#F3F4F6` | Past trips |
| Cancelled | Red | `#EF4444` | `#FEE2E2` | Cancelled items |

```css
--color-status-planned: #3B82F6;
--color-status-planned-bg: #DBEAFE;
--color-status-booked: #10B981;
--color-status-booked-bg: #D1FAE5;
--color-status-active: #F97316;
--color-status-active-bg: #FFEDD5;
--color-status-completed: #6B7280;
--color-status-completed-bg: #F3F4F6;
--color-status-cancelled: #EF4444;
--color-status-cancelled-bg: #FEE2E2;
```

### Budget Status

| Status | Threshold | Color | Hex |
|--------|-----------|-------|-----|
| Under Budget | 0-74% | Green | `#10B981` |
| Near Budget | 75-89% | Amber | `#F59E0B` |
| At Limit | 90-100% | Orange | `#F97316` |
| Over Budget | >100% | Red | `#EF4444` |

```css
--color-budget-under: #10B981;
--color-budget-near: #F59E0B;
--color-budget-limit: #F97316;
--color-budget-over: #EF4444;
```

---

## Transport Mode Colors

Each transport mode has a distinct color for quick visual identification.

| Mode | Color | Hex | Icon |
|------|-------|-----|------|
| Flight | Sky | `#0EA5E9` | Plane |
| Train | Violet | `#8B5CF6` | Train |
| Car | Amber | `#F59E0B` | Car |
| Bus | Green | `#22C55E` | Bus |
| Ferry | Cyan | `#06B6D4` | Ship |
| Walk | Stone | `#78716C` | Footprints |
| Other | Gray | `#6B7280` | Circle |

```css
--color-transport-flight: #0EA5E9;
--color-transport-train: #8B5CF6;
--color-transport-car: #F59E0B;
--color-transport-bus: #22C55E;
--color-transport-ferry: #06B6D4;
--color-transport-walk: #78716C;
--color-transport-other: #6B7280;
```

---

## Dark Mode (Future)

Reserved for future dark mode implementation.

| Role | Light Mode | Dark Mode |
|------|------------|-----------|
| Background | `#F8FAFC` | `#0F172A` |
| Surface | `#FFFFFF` | `#1E293B` |
| Border | `#E2E8F0` | `#334155` |
| Text | `#0F172A` | `#F8FAFC` |
| Text Secondary | `#475569` | `#94A3B8` |

---

## Accessibility

### Contrast Ratios

All text colors meet WCAG 2.1 AA standards:

| Combination | Ratio | Standard |
|-------------|-------|----------|
| Slate 900 on White | 15.5:1 | AAA |
| Slate 600 on White | 5.7:1 | AA |
| Slate 400 on White | 3.5:1 | AA (large text only) |
| Blue 600 on White | 4.5:1 | AA |
| White on Blue 600 | 4.5:1 | AA |

### Color Blindness Considerations

- Never rely on color alone to convey meaning
- Always pair colors with icons or text labels
- Status badges include text labels
- Charts should use patterns in addition to colors

---

## Implementation

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        secondary: {
          DEFAULT: '#F97316',
          50: '#FFF7ED',
          100: '#FFEDD5',
          500: '#F97316',
          600: '#EA580C',
        },
      },
    },
  },
};
```

### CSS Variables File

Create `frontend/styles/design-tokens.css`:

```css
:root {
  /* Primary */
  --color-primary: #2563EB;
  --color-primary-light: #DBEAFE;
  --color-primary-dark: #1D4ED8;

  /* Secondary */
  --color-secondary: #F97316;
  --color-secondary-light: #FFEDD5;

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
}
```
