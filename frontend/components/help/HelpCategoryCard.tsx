'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import * as Icons from 'lucide-react';

interface HelpCategoryCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
}

export function HelpCategoryCard({ title, description, icon, href }: HelpCategoryCardProps) {
  // Dynamically get the icon component
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[icon];

  return (
    <Link href={href}>
      <Card hover padding="lg" className="h-full">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
            {IconComponent && <IconComponent className="w-6 h-6 text-primary-600" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
