'use client';

import {
  HelpLayout,
  HelpSection,
  HelpStepList,
  HelpTip,
  HelpScreenshot,
  HelpDiagram,
} from '@/components/help';

export default function TripsGuidePage() {
  return (
    <HelpLayout
      guideId="trips"
      title="Trip Management"
      description="Create and manage your trips"
      category="Planning"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Trips are the foundation of Travel Planner. Each trip contains destinations, journeys, activities, expenses, and packing lists.
        </p>
      </HelpSection>

      <HelpSection id="create" title="Creating Trips">
        <HelpStepList
          steps={[
            {
              title: 'Navigate to My Trips',
              content: 'Click "My Trips" in the main navigation.',
            },
            {
              title: 'Click Create Trip',
              content: 'Fill in trip name, dates, budget, and status.',
            },
            {
              title: 'Save',
              content: 'Your trip is created and ready for planning!',
            },
          ]}
        />

        <HelpScreenshot
          title="Trip List"
          description="View all your trips with status and dates"
        />
      </HelpSection>

      <HelpSection id="status" title="Trip Status Workflow">
        <p className="mb-4">
          Track your trip progress through different statuses:
        </p>

        <HelpDiagram
          type="flow"
          nodes={[
            { id: 'planning', label: 'Planning', color: 'warning' },
            { id: 'booked', label: 'Booked', color: 'primary' },
            { id: 'ongoing', label: 'Ongoing', color: 'success' },
            { id: 'completed', label: 'Completed', color: 'primary' },
          ]}
          edges={[
            { from: 'planning', to: 'booked' },
            { from: 'booked', to: 'ongoing' },
            { from: 'ongoing', to: 'completed' },
          ]}
        />

        <ul className="list-disc ml-6 mt-4 space-y-2">
          <li><strong>Planning</strong>: Still organizing details</li>
          <li><strong>Booked</strong>: Key bookings confirmed</li>
          <li><strong>Ongoing</strong>: Currently on the trip</li>
          <li><strong>Completed</strong>: Trip finished</li>
        </ul>
      </HelpSection>

      <HelpSection id="budget" title="Setting Budgets">
        <p className="mb-4">
          Set a total budget and configure warning thresholds to stay on track.
        </p>

        <HelpTip variant="tip">
          Set warning at 75% and danger at 90% to get alerts before overspending!
        </HelpTip>
      </HelpSection>

      <HelpSection id="edit" title="Editing Trips">
        <p className="mb-4">
          Click the &quot;Edit&quot; button on any trip page to update details, dates, or budget.
        </p>

        <HelpTip variant="warning">
          Changing trip dates won&apos;t automatically update destination or journey dates.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
