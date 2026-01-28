'use client';

import { PackingItem } from '@/lib/types';
import { PackingItemRow } from './PackingItemRow';
import { getCategoryIcon } from './usePacking';

interface PackingCategoryProps {
  category: string;
  items: PackingItem[];
  onTogglePacked: (id: number, currentStatus: boolean) => void;
  onDelete: (id: number) => void;
}

export function PackingCategory({
  category,
  items,
  onTogglePacked,
  onDelete,
}: PackingCategoryProps) {
  const packedInCategory = items.filter((i) => i.is_packed).length;

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span className="text-xl">{getCategoryIcon(category)}</span>
        <span className="capitalize">{category}</span>
        <span className="text-sm text-gray-500 ml-2">
          ({packedInCategory}/{items.length})
        </span>
      </h4>

      <div className="space-y-2">
        {items.map((item) => (
          <PackingItemRow
            key={item.id}
            item={item}
            onTogglePacked={onTogglePacked}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
