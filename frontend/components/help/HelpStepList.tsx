'use client';

import { ReactNode } from 'react';

interface Step {
  title: string;
  content: ReactNode;
}

interface HelpStepListProps {
  steps: Step[];
}

export function HelpStepList({ steps }: HelpStepListProps) {
  return (
    <ol className="space-y-6 my-6">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-sm">
            {index + 1}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">{step.title}</h3>
            <div className="text-slate-700">{step.content}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
