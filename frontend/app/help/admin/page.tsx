'use client';

import { HelpLayout, HelpSection, HelpStepList, HelpTip } from '@/components/help';

export default function AdminGuidePage() {
  return (
    <HelpLayout
      guideId="admin"
      title="Admin Features"
      description="Manage users and system settings"
      category="Admin"
    >
      <HelpSection id="overview" title="Overview">
        <p className="mb-4">
          Admin users have full access to user management and system-wide statistics. The Admin
          panel is accessible from the main navigation and is only visible to users with the
          admin role.
        </p>

        <HelpTip variant="warning">
          This guide is only relevant to users with the admin role. Standard users do not have
          access to the Admin panel.
        </HelpTip>
      </HelpSection>

      <HelpSection id="user-management" title="User Management">
        <HelpStepList
          steps={[
            {
              title: 'Access the Admin Panel',
              content: 'Click the "Admin" link in the main navigation. This is only visible to admin users.',
            },
            {
              title: 'View All Users',
              content: 'The Users list shows all registered users with their email, status, and role.',
            },
            {
              title: 'Manage a User',
              content: (
                <>
                  Click on any user to manage their account:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Activate / Deactivate</strong>: Enable or disable their ability to log in</li>
                    <li><strong>Toggle Admin</strong>: Grant or revoke admin privileges</li>
                    <li><strong>Delete</strong>: Permanently remove the user and their data</li>
                  </ul>
                </>
              ),
            },
          ]}
        />

        <HelpTip variant="info">
          Deactivating a user prevents them from logging in without deleting their trips or
          data — useful if an account needs to be temporarily suspended.
        </HelpTip>
      </HelpSection>

      <HelpSection id="roles" title="User Roles">
        <div className="space-y-4 my-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">Standard User</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>✓ Create and manage their own trips</li>
              <li>✓ Share trips with other users</li>
              <li>✗ No access to the Admin panel</li>
              <li>✗ Cannot view or manage other users&apos; trips</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">Admin User</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>✓ Everything a standard user can do</li>
              <li>✓ Access the Admin panel</li>
              <li>✓ View, activate, deactivate, or delete any user</li>
              <li>✓ Grant or revoke admin role for any user</li>
              <li>✓ View system-wide statistics</li>
            </ul>
          </div>
        </div>

        <HelpTip variant="warning">
          Admin privileges grant significant power — only grant the admin role to trusted users.
          At least one admin must always exist in the system.
        </HelpTip>
      </HelpSection>

      <HelpSection id="statistics" title="System Statistics">
        <p className="mb-4">
          The admin panel includes system-wide statistics to monitor platform usage:
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Total users</strong>: Active and inactive user counts</li>
          <li><strong>Total trips</strong>: Number of trips created across all users</li>
          <li><strong>User activity</strong>: Login recency and engagement metrics</li>
        </ul>
      </HelpSection>
    </HelpLayout>
  );
}
