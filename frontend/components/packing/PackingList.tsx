'use client';

import { usePacking } from './usePacking';
import { usePackingForm } from './usePackingForm';
import { PackingForm } from './PackingForm';
import { PackingProgress } from './PackingProgress';
import { PackingCategory } from './PackingCategory';

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
    </div>
  );
}
