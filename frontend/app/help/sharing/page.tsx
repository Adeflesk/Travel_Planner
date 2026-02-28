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
        <p className="mb-4">
          Share your trips with travel companions so you can plan together. Shared users can view
          or edit the trip depending on the permission level you grant them.
        </p>

        <HelpTip variant="info">
          Only the trip owner can share a trip. Shared users cannot re-share it with others.
        </HelpTip>
      </HelpSection>

      <HelpSection id="share" title="Sharing a Trip">
        <HelpStepList
          steps={[
            {
              title: 'Open Your Trip',
              content: 'Navigate to the trip you want to share.',
            },
            {
              title: 'Click Share',
              content: 'Click the "Share" button on the trip page.',
            },
            {
              title: 'Enter Email Address',
              content: 'Enter the email address of the person you want to share with. They must already have a Travel Planner account.',
            },
            {
              title: 'Set Permission Level',
              content: (
                <>
                  Choose their access level:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>View</strong>: Can see all trip details but cannot make changes</li>
                    <li><strong>Edit</strong>: Can add and modify destinations, days, activities, transport, and expenses</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Send Invitation',
              content: 'Click "Share" to grant access. The user will be able to see the trip immediately.',
            },
          ]}
        />
      </HelpSection>

      <HelpSection id="permissions" title="Permission Levels">
        <div className="space-y-4 my-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">View Access</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>✓ View all trip details — destinations, days, activities, transport, expenses, packing</li>
              <li>✓ Use the Timeline view</li>
              <li>✗ Cannot add, edit, or delete anything</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">Edit Access</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>✓ Everything in View access</li>
              <li>✓ Add and edit destinations, days, activities, transport, expenses, packing items</li>
              <li>✗ Cannot delete the trip</li>
              <li>✗ Cannot change sharing settings</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="manage" title="Managing Sharing">
        <ul className="list-disc ml-6 space-y-2">
          <li>View all users the trip is shared with from the Share panel</li>
          <li>Change a user&apos;s permission level at any time</li>
          <li>Remove a user&apos;s access by clicking the remove button next to their name</li>
        </ul>

        <HelpTip variant="warning">
          Removing a user&apos;s access takes effect immediately — they will no longer be able
          to view or edit the trip.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
