'use client';

import { Package } from 'lucide-react';

interface PackingProgressProps {
  packedCount: number;
  totalCount: number;
  progress: number;
}

export function PackingProgress({
  packedCount,
  totalCount,
  progress,
}: PackingProgressProps) {
  return (
    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg mb-4">
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
          className="bg-white h-full transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-green-100 mt-2">{progress.toFixed(0)}% Complete</p>
    </div>
  );
}
