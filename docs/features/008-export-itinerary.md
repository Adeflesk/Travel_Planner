# Feature: Export Trip Itinerary

**Status:** Planned
**Priority:** Medium
**Complexity:** High

## Overview

Export trip data to PDF or printable format for offline access.

## Requirements

1. Generate formatted itinerary document
2. Include: journeys, accommodations, activities, key contacts
3. Printable format (A4/Letter)
4. Optional: Include booking references, confirmation numbers

## Approach

### Option A: Frontend PDF Generation
- Use library like `react-pdf` or `jspdf`
- Generate PDF client-side
- Pros: No backend changes
- Cons: Limited formatting control

### Option B: Backend PDF Generation
- Use Python library (reportlab, weasyprint)
- Add `/trips/{id}/export` endpoint
- Pros: Better formatting, consistent output
- Cons: More complex, server resources

### Option C: Print Stylesheet
- Add print-specific CSS
- User uses browser print to PDF
- Pros: Simplest
- Cons: Less control over output

**Recommended:** Start with Option C (print stylesheet), add PDF generation later.

## Files to Modify

- `frontend/app/trips/[id]/page.tsx` (print button)
- `frontend/styles/print.css` (new file)
- (Optional) `app/routers/trips.py` - export endpoint

## Acceptance Criteria

- [ ] Export/Print button on trip detail page
- [ ] Clean, readable output
- [ ] All key trip info included
- [ ] Works offline after export
