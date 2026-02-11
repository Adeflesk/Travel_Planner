import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center | Travel Planner',
  description: 'Learn how to use Travel Planner with our comprehensive guides and tutorials',
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
