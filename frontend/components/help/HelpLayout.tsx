'use client';

import { ReactNode } from 'react';
import { HelpBreadcrumb } from './HelpBreadcrumb';
import { HelpSidebar } from './HelpSidebar';
import { getRelatedGuides } from '@/lib/help-content';

interface HelpLayoutProps {
  guideId: string;
  title: string;
  description: string;
  category: string;
  children: ReactNode;
}

export function HelpLayout({ guideId, title, description, category, children }: HelpLayoutProps) {
  const relatedGuides = getRelatedGuides(guideId);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <HelpBreadcrumb
          items={[
            { label: 'Help', href: '/help' },
            { label: category },
            { label: title },
          ]}
        />

        <div className="flex gap-8">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
              <header className="mb-8 pb-6 border-b border-slate-200">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
                <p className="text-lg text-slate-600">{description}</p>
              </header>

              <article>{children}</article>
            </div>
          </main>

          {/* Sidebar */}
          <HelpSidebar relatedGuides={relatedGuides} currentGuideId={guideId} />
        </div>
      </div>
    </div>
  );
}
