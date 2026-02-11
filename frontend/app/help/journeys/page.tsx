'use client';

import {
  HelpLayout,
  HelpSection,
  HelpStepList,
  HelpTip,
  HelpScreenshot,
  HelpDiagram,
} from '@/components/help';

export default function JourneysGuidePage() {
  return (
    <HelpLayout
      guideId="journeys"
      title="Journeys & Transportation"
      description="Plan transportation between destinations"
      category="Travel"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Journeys help you track how you&apos;ll get from one place to another during your trip.
          Whether it&apos;s a flight between cities, a scenic road trip with multiple stops, or a
          train journey, keep all your transportation details organized in one place.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">Point-to-Point Journeys</h4>
            <p className="text-sm text-slate-700">
              Flights, trains, and bus trips between destinations with departure and arrival times
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">Road Trips with Stops</h4>
            <p className="text-sm text-slate-700">
              Car journeys with multiple waypoints, scenic stops, and planned activities along the route
            </p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="transport-modes" title="Transport Modes">
        <p className="mb-4">
          Choose the appropriate transport mode for your journey:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Flight</strong>: Air travel between cities or countries</li>
          <li><strong>Train</strong>: Railway journeys</li>
          <li><strong>Bus</strong>: Coach or bus transport</li>
          <li><strong>Car</strong>: Driving (ideal for road trips with stops)</li>
          <li><strong>Ferry</strong>: Water transport</li>
          <li><strong>Other</strong>: Any other mode of transportation</li>
        </ul>

        <HelpTip variant="info">
          The transport mode helps organize your journeys and can affect route planning options.
        </HelpTip>
      </HelpSection>

      <HelpSection id="add" title="Adding a Journey">
        <HelpStepList
          steps={[
            {
              title: 'Navigate to Journeys Tab',
              content: 'Open your trip and click the "Journeys" tab in the main navigation.',
            },
            {
              title: 'Click Add Journey',
              content: 'Click the "Add Journey" button to open the journey form.',
            },
            {
              title: 'Select Transport Mode',
              content: 'Choose your mode of transportation (flight, train, car, etc.).',
            },
            {
              title: 'Set Origin and Destination',
              content: (
                <>
                  Choose your starting point and ending point. You can:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Link to trip destinations (e.g., Paris → Rome)</li>
                    <li>Enter free text for other locations (e.g., Home Airport, Hotel name)</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Add Departure and Arrival Times',
              content: 'Enter when you depart and when you arrive.',
            },
            {
              title: 'Add Optional Details',
              content: (
                <>
                  Include additional information:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Carrier/airline name</li>
                    <li>Booking reference number</li>
                    <li>Cost and currency</li>
                    <li>Notes or special requirements</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Save Journey',
              content: 'Click "Create Journey" to save.',
            },
          ]}
        />

        <HelpScreenshot
          title="Journey Form"
          description="Add journey with transport mode, origin, destination, and timing"
        />

        <HelpTip variant="tip">
          Add booking references and costs to keep all travel details organized in one place!
        </HelpTip>
      </HelpSection>

      <HelpSection id="flexible-locations" title="Flexible Origin & Destination">
        <p className="mb-4">
          Journeys support flexible location references:
        </p>

        <div className="space-y-4 my-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">Linked to Trip Destinations</h4>
            <p className="text-sm text-slate-700 mb-2">
              Select from your trip&apos;s destinations when traveling between cities in your itinerary.
            </p>
            <p className="text-xs text-slate-600 italic">
              Example: Journey from &quot;Paris&quot; destination to &quot;Rome&quot; destination
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">Free Text Locations</h4>
            <p className="text-sm text-slate-700 mb-2">
              Enter any location name when traveling from/to places not in your destinations list.
            </p>
            <p className="text-xs text-slate-600 italic">
              Example: Journey from &quot;JFK Airport&quot; to &quot;Manhattan Hotel&quot;
            </p>
          </div>
        </div>

        <HelpTip variant="info">
          Use free text for home airports, hotels, or any location that isn&apos;t a main destination.
        </HelpTip>
      </HelpSection>

      <HelpSection id="stops" title="Adding Journey Stops">
        <p className="mb-4">
          For road trips or multi-leg journeys, add stops along your route to plan waypoints,
          scenic viewpoints, meal breaks, or overnight stays.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Open Journey Details',
              content: 'Click on an existing journey to view its details.',
            },
            {
              title: 'Navigate to Stops Section',
              content: 'Scroll to the "Journey Stops" section or click the Stops tab.',
            },
            {
              title: 'Add a Stop',
              content: 'Click "Add Stop" to create a new waypoint.',
            },
            {
              title: 'Enter Stop Details',
              content: (
                <>
                  Fill in the stop information:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Stop Name</strong>: Name of the location (e.g., &quot;Grand Canyon Viewpoint&quot;)</li>
                    <li><strong>Location</strong>: Address or general location</li>
                    <li><strong>Planned Arrival</strong>: When you expect to arrive</li>
                    <li><strong>Planned Departure</strong>: When you plan to leave</li>
                    <li><strong>Notes</strong>: Any additional information</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Reorder Stops',
              content: 'Drag and drop stops to reorder them along your route.',
            },
          ]}
        />

        <HelpScreenshot
          title="Journey Stops"
          description="View and manage stops along your journey route"
        />

        <HelpDiagram
          type="flow"
          nodes={[
            { id: 'start', label: 'Origin', color: 'primary' },
            { id: 'stop1', label: 'Stop 1', color: 'success' },
            { id: 'stop2', label: 'Stop 2', color: 'success' },
            { id: 'stop3', label: 'Stop 3', color: 'success' },
            { id: 'end', label: 'Destination', color: 'primary' },
          ]}
          edges={[
            { from: 'start', to: 'stop1' },
            { from: 'stop1', to: 'stop2' },
            { from: 'stop2', to: 'stop3' },
            { from: 'stop3', to: 'end' },
          ]}
        />

        <HelpTip variant="tip">
          Stops are automatically ordered along your route. You can reorder them by dragging!
        </HelpTip>
      </HelpSection>

      <HelpSection id="stop-options" title="Adding Stop Options">
        <p className="mb-4">
          For each stop, you can add multiple activity options to help plan what to do there.
          This is perfect for exploring different possibilities before finalizing your itinerary.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Open a Stop',
              content: 'Click on a journey stop to view its details.',
            },
            {
              title: 'Add Stop Option',
              content: 'Click "Add Option" in the stop options section.',
            },
            {
              title: 'Enter Option Details',
              content: (
                <>
                  Fill in the activity option:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Name</strong>: Activity name (e.g., &quot;Lunch at Local Cafe&quot;)</li>
                    <li><strong>Description</strong>: Details about the activity</li>
                    <li><strong>Type</strong>: Activity, Meal, Sightseeing, Rest, Fuel, Shopping, or Other</li>
                    <li><strong>Duration</strong>: Estimated time needed</li>
                    <li><strong>Cost</strong>: Expected expense (optional)</li>
                    <li><strong>URL</strong>: Link to website or booking page</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Set Option Status',
              content: (
                <>
                  Choose a status to track your decision:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Considering</strong>: Evaluating this option</li>
                    <li><strong>Selected</strong>: Decided to do this</li>
                    <li><strong>Skipped</strong>: Won&apos;t do this activity</li>
                    <li><strong>Done</strong>: Completed this activity</li>
                  </ul>
                </>
              ),
            },
          ]}
        />

        <HelpScreenshot
          title="Stop Options"
          description="Manage multiple activity options for each stop along your journey"
        />

        <HelpTip variant="success">
          <strong>Pro tip:</strong> Add multiple options for each stop, then mark your final
          choices as &quot;Selected&quot; to create your ideal itinerary!
        </HelpTip>
      </HelpSection>

      <HelpSection id="route-planning" title="Route Planning Features">
        <p className="mb-4">
          For car journeys, track route-specific information:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Distance</strong>: Track kilometers or miles</li>
          <li><strong>Estimated Duration</strong>: Driving time</li>
          <li><strong>Route Type</strong>: Fastest, shortest, scenic, or custom preferences</li>
          <li><strong>Tolls</strong>: Mark if route includes toll roads and estimated costs</li>
          <li><strong>Route Notes</strong>: Special instructions or points of interest</li>
        </ul>

        <HelpTip variant="warning">
          Remember to account for rest stops and meal breaks when calculating total journey time!
        </HelpTip>
      </HelpSection>

      <HelpSection id="documents" title="Journey Documents">
        <p className="mb-4">
          Attach important documents to your journeys:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Tickets</strong>: Flight, train, or bus tickets</li>
          <li><strong>Confirmations</strong>: Booking confirmations</li>
          <li><strong>Rental Agreements</strong>: Car rental documents</li>
          <li><strong>Maps</strong>: Route maps or directions</li>
          <li><strong>Insurance</strong>: Travel insurance documents</li>
        </ul>

        <HelpTip variant="info">
          You can upload files (PDF, images) or save URLs to online documents.
        </HelpTip>
      </HelpSection>

      <HelpSection id="timeline" title="Journey Timeline View">
        <p className="mb-4">
          View your journey with all stops in chronological order using the Journey Timeline feature.
          This shows:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Departure from origin</li>
          <li>Each stop with planned arrival/departure times</li>
          <li>Activities at each stop</li>
          <li>Final arrival at destination</li>
        </ul>

        <HelpTip variant="tip">
          Use the timeline view to identify scheduling conflicts or gaps in your route!
        </HelpTip>
      </HelpSection>

      <HelpSection id="best-practices" title="Best Practices">
        <div className="space-y-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">✓ For Flights & Trains</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Add booking references for easy access</li>
              <li>• Include carrier name and flight/train number</li>
              <li>• Note any transfer or connection details</li>
              <li>• Attach confirmation emails as documents</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">✓ For Road Trips</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Break long drives into multiple stops</li>
              <li>• Add rest stops every 2-3 hours</li>
              <li>• Research and add stop options for flexibility</li>
              <li>• Note scenic viewpoints or photo opportunities</li>
              <li>• Track toll roads and estimated costs</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-slate-900 mb-2">✓ General Tips</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Update actual times if plans change</li>
              <li>• Link journey costs to trip expenses</li>
              <li>• Use the status field to track booking progress</li>
              <li>• Add emergency contact info in notes</li>
            </ul>
          </div>
        </div>
      </HelpSection>
    </HelpLayout>
  );
}
