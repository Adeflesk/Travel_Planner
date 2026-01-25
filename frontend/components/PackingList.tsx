// components/PackingList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PackingItem, PackingItemFormData } from '@/lib/types';
import { packingApi } from '@/lib/api';
import { Trash2, Package, CheckCircle2, Circle } from 'lucide-react';

interface PackingListProps {
  tripId: number;
}

const categories = [
  'clothing',
  'toiletries',
  'electronics',
  'documents',
  'medications',
  'other',
];

export default function PackingList({ tripId }: PackingListProps) {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PackingItemFormData>({
    trip_id: tripId,
    item_name: '',
    category: '',
    quantity: 1,
  });

  const loadItems = useCallback(async () => {
    try {
      const response = await packingApi.getByTripId(tripId);
      setItems(response.data);
    } catch (error) {
      console.error('Error loading packing items:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await packingApi.create(formData);
      setFormData({
        trip_id: tripId,
        item_name: '',
        category: '',
        quantity: 1,
      });
      loadItems();
    } catch (error) {
      console.error('Error creating packing item:', error);
      alert('Failed to create packing item');
    }
  };

  const handleTogglePacked = async (
    id: number,
    currentStatus: boolean
  ) => {
    try {
      await packingApi.update(id, { is_packed: !currentStatus });
      loadItems();
    } catch (error) {
      console.error('Error updating packing item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this item?')) {
      try {
        await packingApi.delete(id);
        loadItems();
      } catch (error) {
        console.error('Error deleting packing item:', error);
      }
    }
  };

  const packedCount = items.filter((item) => item.is_packed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      clothing: '👕',
      toiletries: '🧴',
      electronics: '🔌',
      documents: '📄',
      medications: '💊',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-3">Add Item</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={formData.item_name}
            onChange={(e) =>
              setFormData({ ...formData, item_name: e.target.value })
            }
            placeholder="Item name"
            required
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
          />
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
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
            onChange={(e) =>
              setFormData({ ...formData, quantity: parseInt(e.target.value) })
            }
            placeholder="Quantity"
            min="1"
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
          />
        </div>
        <button
          type="submit"
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg 
                   hover:bg-blue-700"
        >
          Add Item
        </button>
      </form>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 
                    text-white p-6 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-green-100 text-sm">Packing Progress</p>
            <p className="text-3xl font-bold">
              {packedCount} / {totalCount}
            </p>
          </div>
          <Package className="w-12 h-12 text-green-200" />
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-green-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500 
                     rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-green-100 mt-2">
          {progress.toFixed(0)}% Complete
        </p>
      </div>

      {/* Packing List */}
      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500 py-4">
          No items yet. Start adding items to pack!
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
            <div key={category}>
              <h4 className="font-semibold text-gray-700 mb-3 flex 
                           items-center gap-2">
                <span className="text-xl">{getCategoryIcon(category)}</span>
                <span className="capitalize">{category}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({categoryItems.filter(i => i.is_packed).length}/
                  {categoryItems.length})
                </span>
              </h4>
              
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 
                              border rounded-lg transition 
                              ${
                                item.is_packed
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleTogglePacked(
                          item.id,
                          item.is_packed
                        )}
                        className="focus:outline-none"
                      >
                        {item.is_packed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 
                                          hover:text-gray-600" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            item.is_packed
                              ? 'line-through text-gray-500'
                              : 'text-gray-800'
                          }`}
                        >
                          {item.item_name}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700 p-2 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}