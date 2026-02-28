'use client';

import { HelpLayout, HelpSection, HelpTip, HelpDiagram } from '@/components/help';

export default function TimelineGuidePage() {
  return (
    <HelpLayout
      guideId="timeline"
      title="Timeline View"
      description="A chronological view of all days, activities, and transport across your trip"
      category="Features"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          The Timeline tab gives you a read-only, chronological view of your entire trip — every
          day, activity, and transport item in one place. It&apos;s the best way to get a bird&apos;s-eye
          view of your itinerary and spot any gaps or conflicts.
        </p>

        <HelpTip variant="info">
          The Timeline is read-only. To add or edit activities and transport, click through to
          the individual day page.
        </HelpTip>
      </HelpSection>

      <HelpSection id="view" title="What You'll See">
        <p className="mb-4">
          The timeline is organized by day. Each day section shows:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Day heading</strong>: Date, day number, and the location for that day</li>
          <li><strong>Activities</strong>: Each activity with its time, name, and location</li>
          <li><strong>Transport</strong>: Flights, trains, drives, and other transport with departure time, origin, destination, carrier, and booked status</li>
          <li><strong>Cross-day arrivals</strong>: If transport departed on a previous day, the arrival shows as a compact &quot;arriving from&quot; block</li>
          <li><strong>Empty days</strong>: Days with nothing planned show a subtle &quot;Nothing planned · Open day&quot; prompt</li>
        </ul>

        <HelpTip variant="tip">
          Use the timeline to identify days that are too packed or days that have nothing scheduled yet.
        </HelpTip>
      </HelpSection>

      <HelpSection id="cross-day" title="Cross-Day Transport in the Timeline">
        <p className="mb-4">
          When a transport item departs on one day and arrives on another (e.g. an overnight
          flight or a long train), the timeline shows it on both days:
        </p>

        <HelpDiagram
          type="flow"
          nodes={[
            { id: 'day1', label: 'Day 1 — Departure', color: 'primary' },
            { id: 'transit', label: 'In transit', color: 'warning' },
            { id: 'day2', label: 'Day 2 — Arrival', color: 'success' },
          ]}
          edges={[
            { from: 'day1', to: 'transit' },
            { from: 'transit', to: 'day2' },
          ]}
        />

        <div className="space-y-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-1">Departure Day</h4>
            <p className="text-sm text-slate-700">
              Full transport details with a badge showing it arrives on a later day.
            </p>
            <p className="text-xs text-slate-600 italic mt-1">
              ✈ Sydney (SYD) → Dubai (DXB) · departs 11:00 → arrives Day 2 at 06:20
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-1">Arrival Day</h4>
            <p className="text-sm text-slate-700">
              A compact &quot;arriving from&quot; block showing the arrival time and origin.
            </p>
            <p className="text-xs text-slate-600 italic mt-1">
              ← Arriving from Sydney (SYD) · 06:20
            </p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="unscheduled" title="Unscheduled Transport">
        <p className="mb-4">
          Transport items that haven&apos;t been assigned to a day yet appear in an
          &quot;Unscheduled Transport&quot; section at the bottom of the timeline.
        </p>

        <HelpTip variant="warning">
          Assign unscheduled transport to a day from the day page before your trip — unscheduled
          items won&apos;t appear in the day-by-day itinerary.
        </HelpTip>
      </HelpSection>

      <HelpSection id="navigate" title="Navigating from the Timeline">
        <p className="mb-4">
          The timeline is read-only, but you can jump straight to any day to make changes:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Click a <strong>day heading</strong> to open that day page</li>
          <li>Click an <strong>activity or transport item</strong> to edit it directly</li>
          <li>Click the <strong>&quot;Nothing planned · Open day&quot;</strong> prompt on an empty day to start filling it in</li>
        </ul>
      </HelpSection>

      <HelpSection id="benefits" title="Getting the Most from the Timeline">
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Spot gaps</strong>: Days with no activities or transport planned are highlighted</li>
          <li><strong>Check transport flow</strong>: Verify cross-day arrivals land on the right day</li>
          <li><strong>Review booked status</strong>: See at a glance which transport is confirmed (booked) vs. still pending</li>
          <li><strong>Share the plan</strong>: The timeline is a great view to walk through with travel companions</li>
        </ul>

        <HelpTip variant="tip">
          Use the Days tab to edit your itinerary and the Timeline tab to review the big picture.
          They complement each other perfectly.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
