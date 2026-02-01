# Feature: Timeline Conflict Detection

**Status:** Complete
**Priority:** Medium
**Complexity:** Medium

## Overview

Detect and highlight scheduling conflicts or gaps on the timeline (overlapping bookings, missing connections).

## Requirements

1. Detect overlapping journeys (departure before previous arrival)
2. Detect large gaps between events
3. Visual warning indicators
4. Optional: suggest fixes

## Approach

### Conflict Detection Logic
- Sort all events by start datetime
- Compare each event's start with previous event's end
- Flag overlaps (start < previous end)
- Flag gaps > threshold (e.g., 24 hours)

### Visual Indicators
- Red border/icon for conflicts
- Yellow/orange for warnings (gaps)
- Tooltip explaining the issue

## Files to Modify

- `frontend/components/timeline/useTimeline.ts` (add conflict detection)
- `frontend/components/timeline/TripTimeline.tsx` (render warnings)
- `frontend/components/timeline/TimelineJourney.tsx` (conflict styling)

## UI Design

```
⚠️ 8-hour gap before next journey

🔴 Dublin → London (Conflict!)
   Overlaps with previous journey by 2 hours
```

## Acceptance Criteria

- [x] Overlapping events highlighted in red
- [x] Large gaps (>24h) show warning in amber
- [x] Clear explanation of each issue with duration
- [x] No false positives for valid schedules
