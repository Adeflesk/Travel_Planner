'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip, HelpDiagram } from '@/components/help';

export default function DestinationsGuidePage() {
  return (
    <HelpLayout
      guideId="destinations"
      title="Destinations"
      description="Add and organize trip destinations"
      category="Planning"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Destinations are the cities or places you&apos;ll visit during your trip. Each
          destination has its own arrival and departure dates, and forms the backbone of your
          itinerary — days are generated between your destinations so you can plan activities
          and transport day by day.
        </p>

        <HelpDiagram
          type="flow"
          nodes={[
            { id: 'trip', label: 'Your Trip', color: 'primary' },
            { id: 'dest1', label: 'Paris', color: 'success' },
            { id: 'dest2', label: 'Rome', color: 'success' },
            { id: 'dest3', label: 'Barcelona', color: 'success' },
          ]}
          edges={[
            { from: 'trip', to: 'dest1' },
            { from: 'trip', to: 'dest2' },
            { from: 'trip', to: 'dest3' },
          ]}
        />
      </HelpSection>

      <HelpSection id="add" title="Adding Destinations">
        <HelpStepList
          steps={[
            {
              title: 'Open Your Trip',
              content: 'Navigate to your trip from the My Trips page.',
            },
            {
              title: 'Go to Destinations Tab',
              content: 'Click the "Destinations" tab in the trip detail page.',
            },
            {
              title: 'Click "Add Destination"',
              content: (
                <>
                  Click <strong>&quot;Add Destination&quot;</strong> and fill in:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Name</strong>: The city or place (e.g., &quot;Paris&quot;)</li>
                    <li><strong>Country</strong>: Country of the destination</li>
                    <li><strong>Arrival date</strong>: When you arrive</li>
                    <li><strong>Departure date</strong>: When you leave</li>
                    <li><strong>Notes</strong>: Anything useful to remember (optional)</li>
                  </ul>
                </>
              ),
            },
          ]}
        />

        <HelpTip variant="tip">
          Destinations are automatically ordered by arrival date. Add them in any order and
          the itinerary will sort them correctly.
        </HelpTip>
      </HelpSection>

      <HelpSection id="dates" title="Arrival & Departure Dates">
        <p className="mb-4">
          Dates define when you&apos;re at each destination and drive your day-by-day itinerary:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Arrival date</strong>: The day you arrive in the destination</li>
          <li><strong>Departure date</strong>: The day you leave</li>
          <li>Days between destinations are automatically created in the Day Builder</li>
          <li>Overlapping dates between destinations are flagged as a scheduling conflict</li>
        </ul>

        <HelpTip variant="info">
          Changing a destination&apos;s dates won&apos;t automatically update activities or
          transport already planned for those days. Review your day pages after any date changes.
        </HelpTip>
      </HelpSection>

      <HelpSection id="edit" title="Editing & Removing Destinations">
        <ul className="list-disc ml-6 space-y-2">
          <li>Click a destination to open it for editing</li>
          <li>Update the name, country, or dates at any time</li>
          <li>Remove a destination using the delete option in the destination menu</li>
        </ul>

        <HelpTip variant="warning">
          Removing a destination doesn&apos;t automatically delete activities or transport
          planned for those days — review your day pages after removing a destination.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
