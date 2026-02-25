'use client';

import { HelpSearchBar, HelpCategoryCard } from '@/components/help';
import { helpCategories, getGuidesByCategory } from '@/lib/help-content';
import { useAuth } from '@/lib/auth-context';

export default function HelpPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Filter out admin category if not admin
  const visibleCategories = helpCategories.filter((category) =>
    category.id === 'admin' ? isAdmin : true
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-linear-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl text-primary-100 mb-8">
            Learn how to make the most of Travel Planner
          </p>
          <HelpSearchBar autoFocus placeholder="Search for guides, features, or topics..." />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCategories.map((category) => {
            const guides = getGuidesByCategory(category.id);
            const firstGuide = guides[0];

            if (!firstGuide) return null;

            return (
              <HelpCategoryCard
                key={category.id}
                title={category.title}
                description={category.description}
                icon={category.icon}
                href={firstGuide.path}
              />
            );
          })}
        </div>

        <div className="mt-16 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Need more help?
          </h2>
          <p className="text-slate-700">
            Can&apos;t find what you&apos;re looking for? Contact support or check our documentation for more detailed information.
          </p>
        </div>
      </div>
    </div>
  );
}
