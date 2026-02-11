'use client';

import {
  HelpLayout,
  HelpSection,
  HelpStepList,
  HelpTip,
  HelpScreenshot,
} from '@/components/help';

export default function ExpensesGuidePage() {
  return (
    <HelpLayout
      guideId="expenses"
      title="Budget & Expenses"
      description="Track spending and manage your trip budget"
      category="Budget"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Track all your trip expenses in one place and monitor your budget in real-time.
        </p>
      </HelpSection>

      <HelpSection id="add-expense" title="Adding Expenses">
        <HelpStepList
          steps={[
            {
              title: 'Navigate to Expenses Tab',
              content: 'Open your trip and click the "Expenses" tab.',
            },
            {
              title: 'Add Expense',
              content: 'Click "Add Expense" and fill in category, amount, and description.',
            },
            {
              title: 'Link to Destination or Activity',
              content: 'Optionally link the expense to a specific destination or activity.',
            },
            {
              title: 'Mark Status',
              content: 'Check "Booked" if reserved, "Paid" if already paid.',
            },
          ]}
        />

        <HelpScreenshot
          title="Expense Form"
          description="Add expense with category, amount, and optional links"
        />
      </HelpSection>

      <HelpSection id="categories" title="Expense Categories">
        <p className="mb-4">
          Organize expenses by category for better tracking:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Accommodation</strong>: Hotels, rentals</li>
          <li><strong>Transport</strong>: Flights, trains, car rentals</li>
          <li><strong>Food</strong>: Meals and dining</li>
          <li><strong>Activities</strong>: Tours, attractions</li>
          <li><strong>Shopping</strong>: Souvenirs, purchases</li>
          <li><strong>Other</strong>: Miscellaneous costs</li>
        </ul>
      </HelpSection>

      <HelpSection id="budget-tracking" title="Budget Tracking">
        <p className="mb-4">
          View budget progress in the trip sidebar and expenses tab. The progress bar shows:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Total spent vs. budget</li>
          <li>Percentage used</li>
          <li>Color-coded alerts (green → yellow → red)</li>
        </ul>

        <HelpTip variant="warning">
          Budget warnings appear when you exceed warning threshold (default 75%).
        </HelpTip>

        <HelpTip variant="info">
          Budget breakdown shows spending by category to help identify where money goes.
        </HelpTip>
      </HelpSection>

      <HelpSection id="currency" title="Multi-Currency Support">
        <p className="mb-4">
          Track expenses in different currencies. Each expense can have its own currency.
        </p>

        <HelpTip variant="tip">
          The system displays all amounts in their original currency for accurate tracking.
        </HelpTip>
      </HelpSection>
    </HelpLayout>
  );
}
