'use client';

import {
  HelpLayout,
  HelpSection,
  HelpStepList,
  HelpTip,
  HelpDiagram,
} from '@/components/help';

export default function JourneysGuidePage() {
  return (
    <HelpLayout
      guideId="journeys"
      title="Transport"
      description="Add and manage transport on your day itinerary"
      category="Travel"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Transport items live on your day pages alongside activities, building your itinerary
          chronologically day by day. Whether it&apos;s a flight, train, road trip, or ferry —
          each transport item is tied to the day it departs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">On Your Day Page</h4>
            <p className="text-sm text-slate-700">
              Open any day and add transport alongside your activities. Everything is ordered
              chronologically by time.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">Trip Timeline</h4>
            <p className="text-sm text-slate-700">
              The Timeline tab gives you a read-only chronological view of all days, activities,
              and transport across your entire trip.
            </p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="transport-modes" title="Transport Types">
        <p className="mb-4">
          Choose the appropriate type for your transport:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Flight</strong>: Air travel between cities or countries</li>
          <li><strong>Train</strong>: Railway journeys</li>
          <li><strong>Bus</strong>: Coach or bus transport</li>
          <li><strong>Drive</strong>: Car journeys (own car or rental)</li>
          <li><strong>Ferry</strong>: Water transport</li>
          <li><strong>Other</strong>: Any other mode of transportation</li>
        </ul>

        <HelpTip variant="info">
          Some types unlock extra fields — drives show a distance field; flights show a flight
          number field; trains and buses show a frequency field.
        </HelpTip>
      </HelpSection>

      <HelpSection id="add" title="Adding Transport to a Day">
        <HelpStepList
          steps={[
            {
              title: 'Open a Day',
              content: 'Navigate to your trip and open the Days tab. Click on the day you want to add transport to.',
            },
            {
              title: 'Click "+ Add Transport"',
              content: 'You\'ll see an "+ Add Transport" button alongside the "+ Add Activity" button in the day view.',
            },
            {
              title: 'Choose Transport Type',
              content: 'Select flight, train, bus, drive, ferry, or other.',
            },
            {
              title: 'Set Origin and Destination',
              content: (
                <>
                  Enter where you&apos;re travelling from and to. Use free text — for example:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>&quot;Sydney Airport (SYD)&quot; → &quot;London Heathrow (LHR)&quot;</li>
                    <li>&quot;Paris Gare du Nord&quot; → &quot;Amsterdam Centraal&quot;</li>
                    <li>&quot;Hotel car park&quot; → &quot;Grand Canyon South Rim&quot;</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Set Departure & Arrival',
              content: (
                <>
                  Set the departure day and time. If your transport arrives on a different day
                  (e.g. an overnight flight), set the arrival day separately — the transport will
                  appear on both days.
                </>
              ),
            },
            {
              title: 'Add Optional Details',
              content: (
                <>
                  Fill in extra details as you have them:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Carrier / airline / operator name</li>
                    <li>Booking reference or flight number</li>
                    <li>Cost and currency</li>
                    <li>Notes</li>
                    <li>Type-specific: distance (drive), frequency (bus/train), flight number (flight)</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Toggle "Booked" When Confirmed',
              content: 'Once your ticket is booked, mark it as Booked to visually confirm it on the day timeline.',
            },
          ]}
        />

        <HelpTip variant="tip">
          Add booking references and costs to keep all travel details in one place. You can
          promote transport costs to tracked trip expenses from the Expenses tab.
        </HelpTip>
      </HelpSection>

      <HelpSection id="cross-day" title="Cross-Day Transport">
        <p className="mb-4">
          When a transport item departs on one day and arrives on a different day (e.g. an
          overnight flight or a long train journey), it appears on <strong>both</strong> day pages:
        </p>

        <div className="space-y-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">On the Departure Day</h4>
            <p className="text-sm text-slate-700">
              Shows the full transport details with a badge indicating it arrives on a later day.
            </p>
            <p className="text-xs text-slate-600 italic mt-1">
              Example: ✈ Sydney (SYD) → Dubai (DXB) · Departs 11:00 → arrives Day 2 at 06:20
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">On the Arrival Day</h4>
            <p className="text-sm text-slate-700">
              Shows a compact arrival block with the arrival time and origin.
            </p>
            <p className="text-xs text-slate-600 italic mt-1">
              Example: ← Arriving from Sydney (SYD) at 06:20
            </p>
          </div>
        </div>

        <HelpDiagram
          type="flow"
          nodes={[
            { id: 'day1', label: 'Day 1 (Departure)', color: 'primary' },
            { id: 'day2', label: 'Day 2 (Arrival)', color: 'success' },
          ]}
          edges={[
            { from: 'day1', to: 'day2', label: 'Overnight flight' },
          ]}
        />

        <HelpTip variant="info">
          The Trip Timeline view makes cross-day transport easy to follow — you can see the full
          journey across days in one place.
        </HelpTip>
      </HelpSection>

      <HelpSection id="compare-options" title="Comparing Transport Options">
        <p className="mb-4">
          Not sure which flight or train to take? Add multiple options to a single transport item
          and compare them side by side before committing.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Add a Transport Item',
              content: 'Create a transport item on a day page without filling in all details yet.',
            },
            {
              title: 'Click "+ Add Option"',
              content: 'In the transport item, click the "Add Option" button to add a comparable alternative.',
            },
            {
              title: 'Fill in Option Details',
              content: (
                <>
                  Each option can have its own:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Name (e.g. &quot;Vueling flight VY7821&quot; or &quot;Renfe AVE&quot;)</li>
                    <li>Carrier and duration</li>
                    <li>Cost and currency</li>
                    <li>Booking URL</li>
                    <li>Status: Researching, Selected, Booked, or Rejected</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Select Your Preferred Option',
              content: 'When you\'ve decided, mark one option as "Selected." Its details will be promoted to the parent transport item.',
            },
            {
              title: 'Mark as Booked',
              content: 'Once the ticket is confirmed, mark the option as "Booked" to update the transport item\'s booked status.',
            },
          ]}
        />

        <HelpTip variant="success">
          <strong>Pro tip:</strong> Use the Researching status to track options you&apos;re still
          evaluating, and Rejected for ones you&apos;ve ruled out — so you remember what you
          already considered.
        </HelpTip>
      </HelpSection>

      <HelpSection id="unscheduled" title="Unscheduled Transport">
        <p className="mb-4">
          If you know you need a transport but haven&apos;t figured out the day yet, you can save
          it without a departure day. Unscheduled transport items appear in a separate
          &quot;Unscheduled Transport&quot; section at the bottom of the Trip Timeline, so
          nothing gets lost.
        </p>

        <HelpTip variant="warning">
          Don&apos;t forget to assign unscheduled transport to a day before your trip — they
          won&apos;t appear in the day-by-day itinerary until you do.
        </HelpTip>
      </HelpSection>

      <HelpSection id="best-practices" title="Best Practices">
        <div className="space-y-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">✓ For Flights</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Add the flight number in the reference field</li>
              <li>• Use the confirmation number as the booking reference</li>
              <li>• Set carrier to the airline (e.g. &quot;Qatar Airways&quot;)</li>
              <li>• Set departure and arrival days carefully for overnight flights</li>
              <li>• Mark as Booked once tickets are confirmed</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">✓ For Drives</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Enter the distance in the distance field</li>
              <li>• Break multi-day drives into separate transport items per day</li>
              <li>• Add fuel or toll costs to the Expenses tab</li>
              <li>• Use notes for parking info or road conditions</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-slate-900 mb-2">✓ General Tips</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Update costs as you book to keep your budget accurate</li>
              <li>• Use the Timeline tab to spot scheduling gaps or conflicts</li>
              <li>• Add notes for check-in times, terminal info, or platform numbers</li>
              <li>• Use transport options to compare prices before booking</li>
            </ul>
          </div>
        </div>
      </HelpSection>
    </HelpLayout>
  );
}
