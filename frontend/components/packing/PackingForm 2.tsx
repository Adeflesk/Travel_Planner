'use client';

import { PackingItemFormData } from '@/lib/types';
import { categories } from './usePacking';

interface PackingFormProps {
  formData: PackingItemFormData;
  onSubmit: (e: React.FormEvent) => void;
  updateField: <K extends keyof PackingItemFormData>(
    field: K,
    value: PackingItemFormData[K]
  ) => void;
}

export function PackingForm({
  formData,
  onSubmit,
  updateField,
}: PackingFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-3">Add Item</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={formData.item_name}
          onChange={(e) => updateField('item_name', e.target.value)}
          placeholder="Item name"
          required
          className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
        />
        <select
          value={formData.category}
          onChange={(e) => updateField('category', e.target.value)}
          className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs"
        >
          <option value="">Category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => updateField('quantity', parseInt(e.target.value))}
          placeholder="Quantity"
          min="1"
          className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
        />
      </div>
      <button
        type="submit"
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Add Item
      </button>
    </form>
  );
}
