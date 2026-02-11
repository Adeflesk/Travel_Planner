'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function DestinationsGuidePage() {
  return (
    <HelpLayout
      guideId="destinations"
      title="Destinations"
      description="Add and organize trip destinations"
      category="Planning"
    >
      <HelpSection id="overview" title="Overview">
        <p>Destinations are the places you&apos;ll visit during your trip.</p>
      </HelpSection>

      <HelpSection id="add" title="Adding Destinations">
        <HelpStepList
          steps={[
            { title: 'Open Trip', content: 'Navigate to your trip page' },
            { title: 'Destinations Tab', content: 'Click the Destinations tab' },
            { title: 'Add Destination', content: 'Fill in name, country, and dates' },
          ]}
        />
      </HelpSection>

      <HelpSection id="dates" title="Arrival & Departure Dates">
        <p>Set arrival and departure dates for each destination to organize your itinerary.</p>
        <HelpTip variant="info">
          Destinations are automatically ordered by arrival date.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
