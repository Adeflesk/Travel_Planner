'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function ActivitiesGuidePage() {
  return (
    <HelpLayout
      guideId="activities"
      title="Activities"
      description="Schedule activities on your day pages"
      category="Travel"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Activities are the things you plan to do during each day of your trip — tours,
          restaurant bookings, museum visits, hikes, or anything else. They live on your
          day pages alongside transport, building a complete chronological itinerary for
          each day.
        </p>

        <HelpTip variant="info">
          Activities appear in the Trip Timeline alongside transport, so you can see the
          full shape of each day at a glance.
        </HelpTip>
      </HelpSection>

      <HelpSection id="add" title="Adding Activities">
        <HelpStepList
          steps={[
            {
              title: 'Open the Days Tab',
              content: 'Navigate to your trip and click the "Days" tab.',
            },
            {
              title: 'Open a Day',
              content: 'Click on the day you want to add an activity to.',
            },
            {
              title: 'Click "+ Add Activity"',
              content: 'Click the "+ Add Activity" button in the day view.',
            },
            {
              title: 'Fill in Activity Details',
              content: (
                <>
                  Enter the activity information:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Name</strong>: What you&apos;re doing (e.g., &quot;Sagrada Família tour&quot;)</li>
                    <li><strong>Time</strong>: When it starts (used to order activities on the day)</li>
                    <li><strong>Location</strong>: Where it takes place (optional)</li>
                    <li><strong>Notes</strong>: Booking info, address, or anything useful (optional)</li>
                    <li><strong>Cost</strong>: Estimated or actual cost (optional)</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Save',
              content: 'The activity appears in the day timeline, ordered by time.',
            },
          ]}
        />

        <HelpTip variant="tip">
          Activities are ordered chronologically by their start time within each day.
          Set a time so they sort correctly alongside transport.
        </HelpTip>
      </HelpSection>

      <HelpSection id="types" title="Activity Types">
        <p className="mb-4">
          Use activity types to categorise what you&apos;re doing:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Activity</strong>: Sightseeing, tours, attractions</li>
          <li><strong>Meal</strong>: Restaurant bookings, food markets, cafés</li>
          <li><strong>Accommodation</strong>: Hotel check-in/check-out reminders</li>
          <li><strong>To-do</strong>: Tasks to complete (pick up tickets, get cash, etc.)</li>
          <li><strong>Other</strong>: Anything that doesn&apos;t fit another category</li>
        </ul>
      </HelpSection>

      <HelpSection id="day-timeline" title="Activities in the Day Timeline">
        <p className="mb-4">
          Within a day, activities and transport appear together in a single chronological
          timeline ordered by time. This makes it easy to spot conflicts or gaps:
        </p>

        <div className="space-y-3 my-4 font-mono text-sm">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Day 3 · Friday 14 March · Rome</p>
            <p><span className="text-slate-400 w-14 inline-block">08:00</span> <span className="text-blue-700">[Activity]</span> Breakfast at Tonnarello</p>
            <p><span className="text-slate-400 w-14 inline-block">09:30</span> <span className="text-blue-700">[Activity]</span> Colosseum guided tour</p>
            <p><span className="text-slate-400 w-14 inline-block">13:00</span> <span className="text-blue-700">[Activity]</span> Lunch near the Forum</p>
            <p><span className="text-slate-400 w-14 inline-block">15:30</span> <span className="text-green-700">[Transport]</span> ✈ Rome (FCO) → London (LHR)</p>
          </div>
        </div>

        <HelpTip variant="tip">
          Use the Trip Timeline tab for a read-only view of all days together — great for
          reviewing the full itinerary before you travel.
        </HelpTip>
      </HelpSection>

      <HelpSection id="edit-delete" title="Editing & Deleting Activities">
        <ul className="list-disc ml-6 space-y-2">
          <li>Click any activity in the day view to open it for editing</li>
          <li>Update the time, name, location, or notes as your plans evolve</li>
          <li>Delete an activity using the delete option in the activity menu</li>
        </ul>

        <HelpTip variant="warning">
          Deleting an activity is permanent — there&apos;s no undo. Double-check before deleting.
        </HelpTip>
      </HelpSection>

      <HelpSection id="best-practices" title="Best Practices">
        <ul className="list-disc ml-6 space-y-2">
          <li>Add a time to every activity so the day timeline sorts correctly</li>
          <li>Use notes to store booking references, opening hours, or addresses</li>
          <li>Add costs to activities and promote them to expenses for budget tracking</li>
          <li>Don&apos;t over-schedule — leave buffer time between activities and transport</li>
          <li>Use the day view to review how packed each day is before your trip</li>
        </ul>
      </HelpSection>
    </HelpLayout>
  );
}
