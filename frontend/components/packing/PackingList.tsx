'use client';

import { usePacking } from './usePacking';
import { usePackingForm } from './usePackingForm';
import { PackingForm } from './PackingForm';
import { PackingProgress } from './PackingProgress';
import { PackingCategory } from './PackingCategory';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PackingListProps {
  tripId: number;
}

export default function PackingList({ tripId }: PackingListProps) {
  const {
    items,
    loading,
    packedCount,
    totalCount,
    progress,
    itemsByCategory,
    reload,
    togglePacked,
    deleteItem,
  } = usePacking(tripId);

  const { formData, handleSubmit, updateField } = usePackingForm(tripId, reload);
  const [showItems, setShowItems] = useState(true);

  const handleDelete = async (id: number) => {
    if (confirm('Delete this item?')) {
      await deleteItem(id);
    }
  };

  return (
    <div>
      <PackingForm
        formData={formData}
        onSubmit={handleSubmit}
        updateField={updateField}
      />

      <PackingProgress
        packedCount={packedCount}
        totalCount={totalCount}
        progress={progress}
      />

      <button
        onClick={() => setShowItems((prev) => !prev)}
        className="mt-4 mb-2 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2"
        aria-expanded={showItems}
      >
        {showItems ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {showItems ? 'Hide packing list' : 'Show packing list'}
      </button>

      {showItems && (
        <>
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No items yet. Start adding items to pack!
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                <PackingCategory
                  key={category}
                  category={category}
                  items={categoryItems}
                  onTogglePacked={togglePacked}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
