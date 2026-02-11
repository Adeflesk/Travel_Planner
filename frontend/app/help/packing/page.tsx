'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function PackingGuidePage() {
  return (
    <HelpLayout
      guideId="packing"
      title="Packing Lists"
      description="Create and track packing lists"
      category="Preparation"
    >
      <HelpSection id="overview" title="Overview">
        <p>Create packing lists and track what you&apos;ve packed for your trip.</p>
      </HelpSection>

      <HelpSection id="add" title="Creating Packing Lists">
        <HelpStepList
          steps={[
            { title: 'Packing Tab', content: 'Click Packing List in your trip' },
            { title: 'Add Items', content: 'Enter item name, category, and quantity' },
            { title: 'Check Off', content: 'Mark items as packed when ready' },
          ]}
        />
      </HelpSection>

      <HelpSection id="categories" title="Categories">
        <p>Organize items by category: clothing, toiletries, electronics, documents, etc.</p>
        <HelpTip variant="tip">
          Use the progress indicator to see how much packing you&apos;ve completed!
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
