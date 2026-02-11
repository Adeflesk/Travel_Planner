'use client';

import { HelpLayout, HelpSection, HelpTip } from '@/components/help';

export default function TimelineGuidePage() {
  return (
    <HelpLayout
      guideId="timeline"
      title="Timeline View"
      description="View your trip in chronological order"
      category="Features"
    >
      <HelpSection id="overview" title="Overview">
        <p>The timeline view shows all destinations and journeys in chronological order.</p>
      </HelpSection>

      <HelpSection id="view" title="Using Timeline">
        <p>Click the Timeline tab in your trip to see a chronological view of:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Destinations with arrival/departure dates</li>
          <li>Journeys between locations</li>
          <li>Accommodation stays</li>
        </ul>
        <HelpTip variant="info">
          Timeline is automatically generated from your destinations and journeys.
        </HelpTip>
      </HelpSection>

      <HelpSection id="benefits" title="Benefits">
        <p>Use timeline to:</p>
        <ul className="list-disc ml-6">
          <li>Visualize your trip flow</li>
          <li>Identify scheduling gaps</li>
          <li>Ensure logical travel order</li>
        </ul>
      </HelpSection>
    </HelpLayout>
  );
}
