'use client';

import { Expense } from '@/lib/types';
import { Home } from 'lucide-react';

interface AccommodationInfoProps {
  expenses: Expense[];
}

export function AccommodationInfo({ expenses }: AccommodationInfoProps) {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 ml-7 p-2 bg-blue-50 rounded-md border border-blue-200">
      <div className="flex items-start gap-2">
        <Home className="w-4 h-4 text-blue-600 mt-0.5" />
        <div className="flex-1 text-xs text-blue-700">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center gap-1 mb-0.5">
              <span className="font-medium">
                {exp.description || 'Accommodation'}
              </span>
              <span>
                ${parseFloat(exp.amount.toString()).toFixed(2)}
              </span>
              {exp.booked && <span className="text-blue-600">Booked</span>}
              {exp.paid && <span className="text-green-600">Paid</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
