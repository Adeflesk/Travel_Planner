'use client';

import { useState, useEffect, useCallback } from 'react';
import { PackingItem } from '@/lib/types';
import { packingApi } from '@/lib/api';

export const categories = [
  'clothing',
  'toiletries',
  'electronics',
  'documents',
  'medications',
  'other',
];

export const getCategoryIcon = (category: string) => {
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

export function usePacking(tripId: number) {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const togglePacked = async (id: number, currentStatus: boolean) => {
    try {
      await packingApi.update(id, { is_packed: !currentStatus });
      loadItems();
    } catch (error) {
      console.error('Error updating packing item:', error);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await packingApi.delete(id);
      loadItems();
    } catch (error) {
      console.error('Error deleting packing item:', error);
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

  return {
    items,
    loading,
    packedCount,
    totalCount,
    progress,
    itemsByCategory,
    reload: loadItems,
    togglePacked,
    deleteItem,
  };
}
