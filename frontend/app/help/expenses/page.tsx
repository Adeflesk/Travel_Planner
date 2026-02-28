'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip, HelpScreenshot } from '@/components/help';

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
          Track all your trip costs in one place — from pre-booked flights to daily coffees.
          The Expenses tab gives you a live view of where your money is going and how much
          of your budget remains.
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
              content: 'Click "Add Expense" and fill in category, amount, currency, and description.',
            },
            {
              title: 'Set the Date',
              content: 'Set the date of the expense — useful for reviewing spending day by day.',
            },
            {
              title: 'Mark Status',
              content: (
                <>
                  Use the status fields to track your payment progress:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Booked</strong>: Reserved but not yet paid (e.g. a hotel deposit)</li>
                    <li><strong>Paid</strong>: Money already spent</li>
                  </ul>
                </>
              ),
            },
          ]}
        />

        <HelpScreenshot
          title="Expense Form"
          description="Add expense with category, amount, currency, and status"
        />
      </HelpSection>

      <HelpSection id="categories" title="Expense Categories">
        <p className="mb-4">
          Organize expenses by category for better tracking:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Accommodation</strong>: Hotels, rentals, hostels</li>
          <li><strong>Transport</strong>: Flights, trains, car hire, taxis</li>
          <li><strong>Food</strong>: Meals, groceries, dining</li>
          <li><strong>Activities</strong>: Tours, attractions, tickets</li>
          <li><strong>Shopping</strong>: Souvenirs, clothing, purchases</li>
          <li><strong>Other</strong>: Miscellaneous costs</li>
        </ul>

        <HelpTip variant="tip">
          The budget breakdown chart groups expenses by category — so you can see at a glance
          whether you&apos;re spending most on food, transport, or accommodation.
        </HelpTip>
      </HelpSection>

      <HelpSection id="budget-tracking" title="Budget Tracking">
        <p className="mb-4">
          Set a budget on your trip and the Expenses tab will show you a live progress bar:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Total spent vs. budget</strong>: Running total of all paid expenses</li>
          <li><strong>Percentage used</strong>: How much of the budget you&apos;ve consumed</li>
          <li><strong>Colour-coded alerts</strong>: Green → yellow (approaching limit) → red (over budget)</li>
          <li><strong>Remaining</strong>: How much budget is left to spend</li>
        </ul>

        <HelpTip variant="warning">
          Budget warnings appear when you exceed the warning threshold (default 75%). Set your
          own thresholds in Trip Settings for earlier or later alerts.
        </HelpTip>

        <HelpTip variant="info">
          Only expenses marked <strong>Paid</strong> count toward the budget total. Booked
          expenses are shown separately as &quot;committed&quot; costs.
        </HelpTip>
      </HelpSection>

      <HelpSection id="currency" title="Multi-Currency Support">
        <p className="mb-4">
          Each expense can be recorded in its own currency — useful when travelling across
          countries with different currencies.
        </p>

        <div className="space-y-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">Budget Currency</h4>
            <p className="text-sm text-slate-700">
              Set via the Trip Wizard when creating your trip, or updated in Trip Settings.
              This is the currency your budget total is displayed in.
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">Per-Expense Currency</h4>
            <p className="text-sm text-slate-700">
              Each expense stores its own currency. Expenses in a different currency to your
              budget currency are converted using daily exchange rates and included in your
              budget total automatically.
            </p>
          </div>
        </div>

        <HelpTip variant="tip">
          The system fetches exchange rates daily. If a currency has no stored rate,
          that expense is flagged as excluded from the total with a note.
        </HelpTip>
      </HelpSection>

      <HelpSection id="best-practices" title="Best Practices">
        <ul className="list-disc ml-6 space-y-2">
          <li>Log transport and accommodation costs as soon as you book them — mark as Booked</li>
          <li>Mark expenses as Paid as you spend to keep the budget total accurate</li>
          <li>Use the category breakdown to identify where you&apos;re over-spending</li>
          <li>Set budget warning thresholds in Trip Settings so you get alerts before you overspend</li>
          <li>Add notes to expenses for receipt numbers, vendor names, or reimbursement tracking</li>
        </ul>
      </HelpSection>
    </HelpLayout>
  );
}
