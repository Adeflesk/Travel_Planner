'use client';

import { HelpLayout, HelpSection, HelpTip } from '@/components/help';

export default function DashboardGuidePage() {
  return (
    <HelpLayout
      guideId="dashboard"
      title="Dashboard"
      description="Understand your dashboard and action items"
      category="Features"
    >
      <HelpSection id="overview" title="Overview">
        <p>Your dashboard provides a quick overview of all your trips and important action items.</p>
      </HelpSection>

      <HelpSection id="widgets" title="Dashboard Widgets">
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Next Trip</strong>: Shows your upcoming trip with countdown</li>
          <li><strong>Statistics</strong>: Total trips, countries visited, spending</li>
          <li><strong>Action Items</strong>: Important tasks and alerts</li>
          <li><strong>Recent Trips</strong>: Quick access to recent or active trips</li>
        </ul>
      </HelpSection>

      <HelpSection id="action-items" title="Action Items">
        <p>The dashboard highlights important tasks:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Upcoming booking deadlines</li>
          <li>Budget warnings</li>
          <li>Packing reminders</li>
          <li>Trip starting soon alerts</li>
        </ul>
        <HelpTip variant="tip">
          Action items are prioritized by urgency to help you stay organized!
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
