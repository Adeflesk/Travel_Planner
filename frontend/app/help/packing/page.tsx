'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function PackingGuidePage() {
  return (
    <HelpLayout
      guideId="packing"
      title="Packing Lists"
      description="Create and track packing lists for your trip"
      category="Preparation"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Create packing lists for your trip and check items off as you pack. The progress
          indicator shows how much of your list is complete, so nothing gets left behind.
        </p>
      </HelpSection>

      <HelpSection id="add" title="Creating a Packing List">
        <HelpStepList
          steps={[
            {
              title: 'Open the Packing Tab',
              content: 'Navigate to your trip and click the "Packing" tab.',
            },
            {
              title: 'Add Items',
              content: (
                <>
                  Click <strong>&quot;Add Item&quot;</strong> and fill in:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Name</strong>: What to pack (e.g., &quot;Passport&quot;)</li>
                    <li><strong>Category</strong>: Group by type for easier review</li>
                    <li><strong>Quantity</strong>: How many you need (optional)</li>
                    <li><strong>Notes</strong>: Reminders or specifications (optional)</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Check Off as You Pack',
              content: 'Tick each item as you put it in your bag. The progress bar updates as you go.',
            },
          ]}
        />

        <HelpTip variant="tip">
          Use the progress indicator to see at a glance how much of your packing is done.
          Aim to have everything ticked off a day before you leave!
        </HelpTip>
      </HelpSection>

      <HelpSection id="categories" title="Packing Categories">
        <p className="mb-4">
          Group items by category to make reviewing your list easier:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Documents</strong>: Passport, visas, travel insurance, booking confirmations</li>
          <li><strong>Clothing</strong>: Outfits, shoes, and weather-appropriate layers</li>
          <li><strong>Toiletries</strong>: Essentials, medications, sunscreen</li>
          <li><strong>Electronics</strong>: Phone, chargers, adapters, camera</li>
          <li><strong>Other</strong>: Anything that doesn&apos;t fit another category</li>
        </ul>
      </HelpSection>

      <HelpSection id="best-practices" title="Best Practices">
        <ul className="list-disc ml-6 space-y-2">
          <li>Start your list early — add items as you think of them in the weeks before the trip</li>
          <li>Check off items the day before departure rather than the morning of</li>
          <li>Add quantities for things you need multiples of (e.g., &quot;Socks × 7&quot;)</li>
          <li>Use notes to record specific requirements (e.g., &quot;Check airline carry-on size limit&quot;)</li>
          <li>Re-use a well-tested list on future trips by duplicating your trip</li>
        </ul>

        <HelpTip variant="warning">
          Don&apos;t forget travel documents — passport expiry dates, visas, and travel
          insurance are easy to overlook until it&apos;s too late!
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
