'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function SharingGuidePage() {
  return (
    <HelpLayout
      guideId="sharing"
      title="Trip Sharing"
      description="Share trips with other users"
      category="Collaboration"
    >
      <HelpSection id="overview" title="Overview">
        <p>Share your trips with travel companions to collaborate on planning.</p>
      </HelpSection>

      <HelpSection id="share" title="Sharing a Trip">
        <HelpStepList
          steps={[
            { title: 'Share Button', content: 'Click Share on your trip page' },
            { title: 'Enter Email', content: 'Add the email of the user to share with' },
            { title: 'Set Permission', content: 'Choose view-only or edit access' },
          ]}
        />
        <HelpTip variant="info">
          Only trip owners can share trips with others.
        </HelpTip>
      </HelpSection>

      <HelpSection id="permissions" title="Permission Levels">
        <ul className="list-disc ml-6">
          <li><strong>View</strong>: Can see all trip details but not edit</li>
          <li><strong>Edit</strong>: Can add and modify destinations, activities, expenses, etc.</li>
        </ul>
      </HelpSection>
    </HelpLayout>
  );
}
