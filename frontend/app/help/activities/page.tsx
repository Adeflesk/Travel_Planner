'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function ActivitiesGuidePage() {
  return (
    <HelpLayout
      guideId="activities"
      title="Activities"
      description="Schedule activities and to-dos"
      category="Travel"
    >
      <HelpSection id="overview" title="Overview">
        <p>Plan activities and create to-do lists for each destination.</p>
      </HelpSection>

      <HelpSection id="types" title="Activity Types">
        <p>Activities can be scheduled events or to-do items to complete.</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Scheduled activities have specific dates and times</li>
          <li>To-do items can be checked off as completed</li>
        </ul>
      </HelpSection>

      <HelpSection id="add" title="Adding Activities">
        <HelpStepList
          steps={[
            { title: 'Activities Tab', content: 'Navigate to your trip Activities tab' },
            { title: 'Add Activity', content: 'Enter name, type, and optional schedule' },
            { title: 'Set Priority', content: 'Mark important activities with priority' },
          ]}
        />
        <HelpTip variant="info">
          Link activities to specific destinations to organize your itinerary.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
