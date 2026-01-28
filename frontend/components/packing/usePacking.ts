'use client';

import { useState, useEffect, useCallback } from 'react';
import { PackingItem, PackingSummary } from '@/lib/types';
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

const defaultSummary: PackingSummary = {
  total_items: 0,
  packed_items: 0,
  progress_percent: 0,
  by_category: {},
};

export function usePacking(tripId: number) {
  const [summary, setSummary] = useState<PackingSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const response = await packingApi.getSummary(tripId);
      setSummary(response.data);
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

  // Extract flat items list from summary for backwards compatibility
  const items: PackingItem[] = Object.values(summary.by_category).flatMap(
    (cat) => cat.items
  );

  // Convert by_category to simpler format for itemsByCategory
  const itemsByCategory: Record<string, PackingItem[]> = {};
  for (const [cat, detail] of Object.entries(summary.by_category)) {
    itemsByCategory[cat] = detail.items;
  }

  return {
    items,
    loading,
    packedCount: summary.packed_items,
    totalCount: summary.total_items,
    progress: summary.progress_percent,
    itemsByCategory,
    reload: loadItems,
    togglePacked,
    deleteItem,
  };
}
