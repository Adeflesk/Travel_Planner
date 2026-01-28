'use client';

import { PackingItem } from '@/lib/types';
import { Trash2, CheckCircle2, Circle } from 'lucide-react';

interface PackingItemRowProps {
  item: PackingItem;
  onTogglePacked: (id: number, currentStatus: boolean) => void;
  onDelete: (id: number) => void;
}

export function PackingItemRow({
  item,
  onTogglePacked,
  onDelete,
}: PackingItemRowProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg transition ${
        item.is_packed
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={() => onTogglePacked(item.id, item.is_packed)}
          className="focus:outline-none"
        >
          {item.is_packed ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          )}
        </button>

        <div className="flex-1">
          <p
            className={`font-medium ${
              item.is_packed ? 'line-through text-gray-500' : 'text-gray-800'
            }`}
          >
            {item.item_name}
          </p>
          {item.quantity > 1 && (
            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="text-red-600 hover:text-red-700 p-2 ml-2"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
