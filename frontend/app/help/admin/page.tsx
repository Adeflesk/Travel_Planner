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
        <p>Admin users have access to user management and system statistics.</p>
        <HelpTip variant="warning">
          This guide is only visible to users with admin role.
        </HelpTip>
      </HelpSection>

      <HelpSection id="user-management" title="User Management">
        <HelpStepList
          steps={[
            { title: 'Access Admin Panel', content: 'Click the Admin link in navigation' },
            { title: 'View Users', content: 'See list of all users with their status' },
            { title: 'Manage Users', content: 'Create, activate, deactivate, or delete users' },
          ]}
        />
      </HelpSection>

      <HelpSection id="roles" title="User Roles">
        <ul className="list-disc ml-6">
          <li><strong>Admin</strong>: Full system access including user management</li>
          <li><strong>User</strong>: Standard access to create and manage own trips</li>
        </ul>
        <HelpTip variant="info">
          Toggle admin role on/off for any user from the admin panel.
        </HelpTip>
      </HelpSection>

      <HelpSection id="statistics" title="System Statistics">
        <p>View system-wide statistics including:</p>
        <ul className="list-disc ml-6">
          <li>Total users (active/inactive)</li>
          <li>Total trips in system</li>
          <li>User activity metrics</li>
        </ul>
      </HelpSection>
    </HelpLayout>
  );
}
