# Typography Specification

This document defines the typography system for Travel Planner.

## Design Rationale

Our typography choices prioritize:
- **Readability** - Clear text for itineraries and details
- **Hierarchy** - Easy scanning of trip information
- **Modern feel** - Contemporary, clean aesthetic
- **Performance** - System fonts with web font enhancement

---

## Font Families

### Primary Font: Inter

Inter is our primary typeface for all UI text. It's highly legible at small sizes and has excellent support for numbers (important for dates, prices, times).

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

**Fallback chain:**
1. Inter (loaded via Google Fonts or self-hosted)
2. System fonts (fast loading, familiar to users)
3. Generic sans-serif

### Monospace Font: JetBrains Mono

Used sparingly for:
- Booking reference codes
- Times and durations
- Technical information

```css
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco,
             'Cascadia Code', monospace;
```

---

## Type Scale

Based on a 1.25 ratio (Major Third) with 16px base.

| Name | Size | REM | Line Height | Weight | Tailwind |
|------|------|-----|-------------|--------|----------|
| Display | 48px | 3rem | 1.1 | 700 | `text-5xl` |
| H1 | 36px | 2.25rem | 1.2 | 700 | `text-4xl` |
| H2 | 30px | 1.875rem | 1.3 | 600 | `text-3xl` |
| H3 | 24px | 1.5rem | 1.4 | 600 | `text-2xl` |
| H4 | 20px | 1.25rem | 1.4 | 600 | `text-xl` |
| H5 | 18px | 1.125rem | 1.5 | 600 | `text-lg` |
| Body | 16px | 1rem | 1.5 | 400 | `text-base` |
| Body Small | 14px | 0.875rem | 1.5 | 400 | `text-sm` |
| Caption | 12px | 0.75rem | 1.4 | 400 | `text-xs` |
| Overline | 12px | 0.75rem | 1.4 | 500 | `text-xs uppercase` |

---

## Heading Styles

### Display (Hero sections)
```
Font: Inter
Size: 48px / 3rem
Weight: 700 (Bold)
Line Height: 1.1
Letter Spacing: -0.02em
Color: slate-900
```

**Usage:** Hero sections, landing page headlines

```html
<h1 class="text-5xl font-bold leading-tight tracking-tight text-slate-900">
  Plan Your Next Adventure
</h1>
```

### H1 (Page titles)
```
Font: Inter
Size: 36px / 2.25rem
Weight: 700 (Bold)
Line Height: 1.2
Letter Spacing: -0.01em
Color: slate-900
```

**Usage:** Page titles, trip names

```html
<h1 class="text-4xl font-bold leading-tight text-slate-900">
  Summer Europe 2024
</h1>
```

### H2 (Section headers)
```
Font: Inter
Size: 30px / 1.875rem
Weight: 600 (Semibold)
Line Height: 1.3
Color: slate-900
```

**Usage:** Main section headers on trip detail pages

```html
<h2 class="text-3xl font-semibold text-slate-900">
  Destinations
</h2>
```

### H3 (Subsection headers)
```
Font: Inter
Size: 24px / 1.5rem
Weight: 600 (Semibold)
Line Height: 1.4
Color: slate-900
```

**Usage:** Card titles, modal headers

```html
<h3 class="text-2xl font-semibold text-slate-900">
  Paris, France
</h3>
```

### H4 (Component headers)
```
Font: Inter
Size: 20px / 1.25rem
Weight: 600 (Semibold)
Line Height: 1.4
Color: slate-800
```

**Usage:** Form sections, list group headers

```html
<h4 class="text-xl font-semibold text-slate-800">
  Flight Details
</h4>
```

### H5 (Minor headers)
```
Font: Inter
Size: 18px / 1.125rem
Weight: 600 (Semibold)
Line Height: 1.5
Color: slate-800
```

**Usage:** Sidebar headers, small card titles

```html
<h5 class="text-lg font-semibold text-slate-800">
  Quick Stats
</h5>
```

---

## Body Text Styles

### Body (Default)
```
Font: Inter
Size: 16px / 1rem
Weight: 400 (Regular)
Line Height: 1.5 (24px)
Color: slate-600
```

**Usage:** Paragraphs, descriptions, form labels

```html
<p class="text-base text-slate-600">
  Explore the best destinations in Europe...
</p>
```

### Body Small
```
Font: Inter
Size: 14px / 0.875rem
Weight: 400 (Regular)
Line Height: 1.5 (21px)
Color: slate-600
```

**Usage:** Secondary descriptions, helper text, table cells

```html
<p class="text-sm text-slate-600">
  Departing at 10:30 AM from Terminal 2
</p>
```

### Caption
```
Font: Inter
Size: 12px / 0.75rem
Weight: 400 (Regular)
Line Height: 1.4 (16.8px)
Color: slate-500
```

**Usage:** Timestamps, metadata, fine print

```html
<span class="text-xs text-slate-500">
  Last updated 2 hours ago
</span>
```

### Overline
```
Font: Inter
Size: 12px / 0.75rem
Weight: 500 (Medium)
Line Height: 1.4
Letter Spacing: 0.05em
Text Transform: uppercase
Color: slate-500
```

**Usage:** Section labels, category tags

```html
<span class="text-xs font-medium uppercase tracking-wide text-slate-500">
  Upcoming Trip
</span>
```

---

## Special Text Styles

### Price / Currency
```
Font: Inter
Size: varies (inherit)
Weight: 600 (Semibold)
Font Feature: tabular-nums
Color: varies by context
```

```html
<span class="font-semibold tabular-nums">
  $1,234.56
</span>
```

### Booking Reference
```
Font: JetBrains Mono
Size: 14px / 0.875rem
Weight: 500 (Medium)
Letter Spacing: 0.05em
Color: slate-700
Background: slate-100
```

```html
<code class="font-mono text-sm font-medium tracking-wide text-slate-700 bg-slate-100 px-2 py-1 rounded">
  ABC123XYZ
</code>
```

### Time / Duration
```
Font: Inter (or JetBrains Mono for alignment)
Size: 14px / 0.875rem
Weight: 500 (Medium)
Font Feature: tabular-nums
Color: slate-700
```

```html
<time class="font-medium tabular-nums text-slate-700">
  10:30 AM
</time>
```

### Date Display
```
Font: Inter
Size: 14-16px
Weight: 400-500
Color: slate-700
```

Formats:
- Full: "Monday, June 10, 2024"
- Medium: "Jun 10, 2024"
- Short: "6/10/24"
- Relative: "in 23 days"

```html
<time datetime="2024-06-10" class="text-sm text-slate-700">
  Jun 10, 2024
</time>
```

---

## Text Colors

| Use Case | Color | Tailwind | Hex |
|----------|-------|----------|-----|
| Primary text | slate-900 | `text-slate-900` | #0F172A |
| Secondary text | slate-600 | `text-slate-600` | #475569 |
| Muted text | slate-400 | `text-slate-400` | #94A3B8 |
| Disabled text | slate-300 | `text-slate-300` | #CBD5E1 |
| Link | blue-600 | `text-blue-600` | #2563EB |
| Link hover | blue-700 | `text-blue-700` | #1D4ED8 |
| Success | emerald-600 | `text-emerald-600` | #059669 |
| Warning | amber-600 | `text-amber-600` | #D97706 |
| Error | red-600 | `text-red-600` | #DC2626 |
| On dark bg | white | `text-white` | #FFFFFF |

---

## Link Styles

### Inline Links
```css
color: #2563EB;
text-decoration: none;

&:hover {
  color: #1D4ED8;
  text-decoration: underline;
}

&:focus {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}
```

```html
<a href="#" class="text-blue-600 hover:text-blue-700 hover:underline">
  View details
</a>
```

### Navigation Links
```css
color: #475569;
font-weight: 500;

&:hover {
  color: #0F172A;
}

&.active {
  color: #2563EB;
}
```

---

## Responsive Typography

### Mobile (< 640px)
- H1: 28px (text-3xl)
- H2: 24px (text-2xl)
- H3: 20px (text-xl)
- Body: 16px (text-base)

### Tablet (640px - 1024px)
- H1: 32px
- H2: 26px
- H3: 22px
- Body: 16px

### Desktop (> 1024px)
- H1: 36px (text-4xl)
- H2: 30px (text-3xl)
- H3: 24px (text-2xl)
- Body: 16px (text-base)

```html
<h1 class="text-3xl sm:text-4xl font-bold">
  Trip Title
</h1>
```

---

## Font Loading Strategy

### 1. Self-hosted (Recommended)
Download Inter and host from `/public/fonts/`.

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

### 2. Google Fonts
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Font Display
Always use `font-display: swap` to prevent invisible text during load.

---

## Implementation

### Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    extend: {
      fontSize: {
        // Custom sizes if needed
      },
      lineHeight: {
        'tight': '1.2',
        'snug': '1.3',
      },
      letterSpacing: {
        'tighter': '-0.02em',
      },
    },
  },
};
```

### CSS Variables

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
}
```

---

## Examples

### Trip Card Title
```html
<div class="card">
  <span class="text-xs font-medium uppercase tracking-wide text-slate-500">
    Upcoming Trip
  </span>
  <h3 class="text-xl font-semibold text-slate-900 mt-1">
    Summer Europe 2024
  </h3>
  <p class="text-sm text-slate-600 mt-2">
    Paris, Amsterdam, Berlin
  </p>
  <div class="flex items-center gap-2 mt-3">
    <time class="text-sm tabular-nums text-slate-700">Jun 10 - Jun 25</time>
    <span class="text-slate-300">•</span>
    <span class="text-sm font-medium text-emerald-600">$3,450 spent</span>
  </div>
</div>
```

### Form Label and Input
```html
<div>
  <label class="block text-sm font-medium text-slate-700 mb-1">
    Trip Name
  </label>
  <input type="text" class="text-base text-slate-900" />
  <p class="text-xs text-slate-500 mt-1">
    Give your trip a memorable name
  </p>
</div>
```
