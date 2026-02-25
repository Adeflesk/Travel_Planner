# Architecture Review: Segment Builder UI Complexity

## The Problem: The "One-Size-Fits-All" UI

Currently, the `SegmentBuilder.tsx` component is attempting to provide a single UI interface to build every possible type of journey. It uses an "Intent" system (`AIR_TRAVEL`, `ROAD_TRIP`, `MULTI_STOP`) to seed the builder with different templates.

While the **Backend Data Model** unification (merging `JourneyStops` and `JourneySegments` into a single timeline of `segments`) described in Feature 021 is incredibly smart and should be kept, the **Frontend Builder UI** is becoming overloaded. 

When you look at `SegmentBuilder.tsx`, you can see the complexity leaking out:
```tsx
{(selectedIntent === 'AIR_TRAVEL' || selectedIntent === 'AIR_LAYOVER') && (
  <Button onClick={addLayoverAfterFirstFlight}>Add layover</Button>
)}
{(selectedIntent === 'ROAD_TRIP' || selectedIntent === 'ROAD_TRIP_WITH_STOPS' || selectedIntent === 'MULTI_STOP') && (
  <Button onClick={addSegment}>Add stop</Button>
)}
```
As you add more specific features (e.g., train seat classes, ferry vehicle dimensions, airport terminal numbers), you will have to wedge them all into `SegmentCard.tsx` and `SegmentBuilder.tsx`. This leads to a massive, unmaintainable "God Component."

## Recommendation: Split the Presentation, Keep the Data Unified

**Yes, you should have totally different builders for each type of journey.**

You do not need to change the database or the API. Both a Flight Journey and a Road Trip Journey ultimately output an array of `JourneySegment` objects. However, the *user experience* for creating them should be separated.

### Proposed Architecture

1. **The Shared Data Structure (Already exists)**
   - Everything outputs an array of `JourneySegmentDraft[]`.

2. **The "Smart" Wrapper Component (`JourneyTypeSelector.tsx`)**
   - The user selects the *primary mode* of travel at the journey level (Flight, Drive, Train, Ferry).
   - This wrapper component renders the appropriate builder component below.

3. **Specialized Builder Components**
   - **`FlightBuilder.tsx`**: Highly specialized for air travel. It expects an origin transfer, a flight, and a destination transfer. It has options to specifically inject "Layovers" inside the flight nodes. It asks for flight numbers, terminal gates, and PNRs.
   - **`RoadTripBuilder.tsx`**: Highly specialized for driving. It presents a chronological, drag-and-drop timeline builder. It asks for driving distance, toll costs, and explicitly makes it easy to add `STOP` segments (Lunch, Sightseeing) between `DRIVE` segments.
   - **`TransitBuilder.tsx`**: Specialized for Rail/Bus/Ferry. Focuses on station names, platforms, and seat assignments.

### Why this is better

1. **Clean Code:** `SegmentCard.tsx` can currently show fields that aren't relevant to driving if you aren't careful. Splitting the builders means a `FlightCard` and a `DriveCard` can be strictly typed and perfectly tailored to the data they need to collect.
2. **Better UX:** A user planning a 5-stop road trip thinks very differently than a user trying to plug in their 3-leg international flight itinerary. Tailoring the UI to their mental model reduces friction.
3. **Scalability:** When someone inevitably asks for "Cruise Ship" support, you don't have to break the Road Trip functionality to add it. You just build `CruiseBuilder.tsx` and make it output `JourneySegment` objects.

## Conclusion

**Keep the Feature 021 backend plan.** Having a single `journey_segments` table handle all chronological travel events is industry best-practice.

**Refactor the frontend.** Do not try to make one `SegmentBuilder` rule them all. Build dedicated, tailored UI components that map specific user experiences down into the unified segment array.
