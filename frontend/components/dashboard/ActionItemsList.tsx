'use client';

import Link from 'next/link';
import { AlertTriangle, ClipboardCheck, ClipboardList, Package, Ticket } from 'lucide-react';
import { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface ActionItemsListProps {
  items: DashboardData['action_items'];
}

const typeMeta = {
  booking: { icon: Ticket, label: 'Booking' },
  packing: { icon: Package, label: 'Packing' },
  budget: { icon: AlertTriangle, label: 'Budget' },
  deadline: { icon: ClipboardList, label: 'Deadline' },
  pre_trip_task: { icon: ClipboardList, label: 'Pre-Trip Task' },
  activity_deadline: { icon: ClipboardCheck, label: 'Activity Deadline' },
};

const urgencyVariant = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
} as const;

export function ActionItemsList({ items }: ActionItemsListProps) {
  return (
    <Card padding="md" hover>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Action Items</h3>
        <Badge variant="secondary" size="sm">
          {items.length} items
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-4 text-slate-600">
          <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-800">All caught up</p>
            <p className="text-sm text-slate-500">
              You have no urgent tasks right now.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = typeMeta[item.type].icon;
            return (
              <Link
                key={`${item.trip_id}-${item.type}-${index}`}
                href={`/trips/${item.trip_id}`}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="mt-1 text-primary-500">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <Badge variant={urgencyVariant[item.urgency]} size="sm">
                      {item.urgency}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {item.trip_name} · {item.detail}
                  </p>
                </div>
                <span className="text-sm text-primary-600">Review</span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default ActionItemsList;
