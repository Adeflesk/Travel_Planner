'use client';

import Link from 'next/link';
import { HelpGuide } from '@/lib/help-content';

interface HelpSidebarProps {
  relatedGuides: HelpGuide[];
  currentGuideId: string;
}

export function HelpSidebar({ relatedGuides, currentGuideId }: HelpSidebarProps) {
  if (relatedGuides.length === 0) return null;

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-20">
        <h3 className="font-semibold text-slate-900 mb-4">Related Guides</h3>
        <nav className="space-y-2">
          {relatedGuides.map((guide) => {
            const isCurrent = guide.id === currentGuideId;

            return (
              <Link
                key={guide.id}
                href={guide.path}
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {guide.title}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <Link
            href="/help"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to all guides
          </Link>
        </div>
      </div>
    </aside>
  );
}
