'use client';

import {
  HelpLayout,
  HelpSection,
  HelpStepList,
  HelpTip,
  HelpScreenshot,
  HelpDiagram,
} from '@/components/help';
import Link from 'next/link';
import { MapPinned, Plane, Wallet, Package } from 'lucide-react';

export default function GettingStartedPage() {
  return (
    <HelpLayout
      guideId="getting-started"
      title="Getting Started"
      description="Learn the basics and create your first trip"
      category="Getting Started"
    >
      <HelpSection id="welcome" title="Welcome to Travel Planner">
        <p className="mb-4">
          Travel Planner helps you organize every aspect of your trips in one place. From planning
          destinations and activities to tracking expenses and packing lists, we&apos;ve got you covered.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-lg">
            <MapPinned className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Plan Destinations</h4>
              <p className="text-sm text-slate-700">
                Add and organize all the places you&apos;ll visit
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <Plane className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Track Journeys</h4>
              <p className="text-sm text-slate-700">
                Manage flights, trains, and road trips
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Wallet className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Monitor Budget</h4>
              <p className="text-sm text-slate-700">
                Track expenses and stay within budget
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
            <Package className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Pack Smart</h4>
              <p className="text-sm text-slate-700">
                Create packing lists and track progress
              </p>
            </div>
          </div>
        </div>

        <HelpTip variant="tip">
          <strong>New to trip planning?</strong> Start by creating your first trip and adding a few destinations. You can always add more details later!
        </HelpTip>
      </HelpSection>

      <HelpSection id="create-trip" title="Creating Your First Trip">
        <p className="mb-4">
          Let&apos;s start by creating your first trip. This is the foundation for organizing all your travel plans.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Navigate to My Trips',
              content: (
                <>
                  Click <strong>&quot;My Trips&quot;</strong> in the navigation bar at the top of the page.
                </>
              ),
            },
            {
              title: 'Create a New Trip',
              content: (
                <>
                  Click the <strong>&quot;Create Trip&quot;</strong> button in the top right corner.
                </>
              ),
            },
            {
              title: 'Fill in Trip Details',
              content: (
                <ul className="list-disc ml-5 space-y-2">
                  <li><strong>Trip Name</strong>: Give your trip a memorable name (e.g., &quot;Summer Europe Tour&quot;)</li>
                  <li><strong>Description</strong>: Add a brief description (optional)</li>
                  <li><strong>Dates</strong>: Set your start and end dates</li>
                  <li><strong>Budget</strong>: Set a total budget (optional but recommended)</li>
                  <li><strong>Status</strong>: Choose &quot;Planning&quot; if you&apos;re still organizing</li>
                </ul>
              ),
            },
            {
              title: 'Save Your Trip',
              content: (
                <>
                  Click <strong>&quot;Create Trip&quot;</strong> to save. You&apos;ll be taken to your trip detail page!
                </>
              ),
            },
          ]}
        />

        <HelpScreenshot
          title="Create Trip Form"
          description="The trip creation form with all required fields"
        />

        <HelpTip variant="info">
          You can edit trip details anytime by clicking the &quot;Edit&quot; button on your trip page.
        </HelpTip>
      </HelpSection>

      <HelpSection id="add-destinations" title="Adding Destinations">
        <p className="mb-4">
          Destinations are the places you&apos;ll visit during your trip. Each destination can have its own activities, accommodations, and more.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Open Your Trip',
              content: 'Click on your trip from the My Trips page or dashboard.',
            },
            {
              title: 'Go to Destinations Tab',
              content: 'Click the &quot;Destinations&quot; tab in the trip detail page.',
            },
            {
              title: 'Add a Destination',
              content: (
                <>
                  Click <strong>&quot;Add Destination&quot;</strong> and fill in:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Destination name (e.g., &quot;Paris&quot;)</li>
                    <li>Country and region</li>
                    <li>Arrival and departure dates</li>
                    <li>Any notes or special information</li>
                  </ul>
                </>
              ),
            },
          ]}
        />

        <HelpDiagram
          type="flow"
          nodes={[
            { id: 'trip', label: 'Your Trip', color: 'primary' },
            { id: 'dest1', label: 'Paris', color: 'success' },
            { id: 'dest2', label: 'Rome', color: 'success' },
            { id: 'dest3', label: 'Barcelona', color: 'success' },
          ]}
          edges={[
            { from: 'trip', to: 'dest1' },
            { from: 'trip', to: 'dest2' },
            { from: 'trip', to: 'dest3' },
          ]}
        />

        <HelpTip variant="tip">
          Destinations are automatically ordered by arrival date. You can also manually reorder them by dragging!
        </HelpTip>
      </HelpSection>

      <HelpSection id="plan-journey" title="Planning Your First Journey">
        <p className="mb-4">
          Journeys help you track how you&apos;ll get from one place to another. Whether it&apos;s a flight, train, or road trip, keep all your travel details in one place.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Navigate to Journeys Tab',
              content: 'Click the &quot;Journeys&quot; tab in your trip detail page.',
            },
            {
              title: 'Add a Journey',
              content: (
                <>
                  Click <strong>&quot;Add Journey&quot;</strong> and select:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Transport mode (Flight, Train, Bus, Car, etc.)</li>
                    <li>Origin and destination (can be home airport or a trip destination)</li>
                    <li>Departure and arrival times</li>
                    <li>Cost and booking reference (optional)</li>
                  </ul>
                </>
              ),
            },
          ]}
        />

        <HelpScreenshot
          title="Journey Form"
          description="Add journey details including transport mode and timing"
        />
      </HelpSection>

      <HelpSection id="track-budget" title="Tracking Your Budget">
        <p className="mb-4">
          Stay on top of your spending by tracking expenses and monitoring your budget.
        </p>

        <HelpStepList
          steps={[
            {
              title: 'Set a Trip Budget',
              content: 'When creating or editing your trip, set a total budget amount.',
            },
            {
              title: 'Add Expenses',
              content: (
                <>
                  Go to the <strong>&quot;Expenses&quot;</strong> tab and add costs as you plan or spend:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Choose a category (accommodation, food, transport, etc.)</li>
                    <li>Enter the amount and currency</li>
                    <li>Link to a specific destination or activity (optional)</li>
                    <li>Mark as &quot;booked&quot; or &quot;paid&quot;</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Monitor Budget Status',
              content: 'Watch the budget progress bar to see how much you&apos;ve spent vs. your budget.',
            },
          ]}
        />

        <HelpTip variant="warning">
          Set budget warning and danger thresholds in trip settings to get alerts when you&apos;re approaching your limit!
        </HelpTip>
      </HelpSection>

      <HelpSection id="next-steps" title="Next Steps">
        <p className="mb-4">
          Now that you&apos;ve learned the basics, explore these guides to make the most of Travel Planner:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <Link
            href="/help/activities"
            className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-slate-900 mb-1">Plan Activities</h4>
            <p className="text-sm text-slate-600">
              Schedule things to do and create to-do lists for each destination
            </p>
          </Link>

          <Link
            href="/help/packing"
            className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-slate-900 mb-1">Create Packing Lists</h4>
            <p className="text-sm text-slate-600">
              Build packing lists and track what you&apos;ve packed
            </p>
          </Link>

          <Link
            href="/help/sharing"
            className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-slate-900 mb-1">Share Your Trip</h4>
            <p className="text-sm text-slate-600">
              Collaborate with travel companions by sharing trips
            </p>
          </Link>

          <Link
            href="/help/dashboard"
            className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-slate-900 mb-1">Explore Dashboard</h4>
            <p className="text-sm text-slate-600">
              Understand your dashboard widgets and action items
            </p>
          </Link>
        </div>

        <HelpTip variant="success">
          <strong>Pro tip:</strong> Use the search bar in the Help Center to quickly find answers to specific questions!
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
