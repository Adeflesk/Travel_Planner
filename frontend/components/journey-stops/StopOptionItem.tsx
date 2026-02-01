'use client';

import { StopOption, StopOptionStatus } from '@/lib/types';
import { Trash2, Edit2, Clock, DollarSign, ExternalLink, Check, X, ChevronDown } from 'lucide-react';
import { optionTypeLabels, optionStatusColors, optionTypeIcons } from './useJourneyStops';
import { useState } from 'react';

interface StopOptionItemProps {
  option: StopOption;
  onEdit: (option: StopOption) => void;
  onDelete: (optionId: number) => void;
  onStatusChange: (optionId: number, status: StopOptionStatus) => void;
}

export function StopOptionItem({
  option,
  onEdit,
  onDelete,
  onStatusChange,
}: StopOptionItemProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const statusOptions: { value: StopOptionStatus; label: string; icon: React.ReactNode }[] = [
    { value: 'considering', label: 'Considering', icon: '🤔' },
    { value: 'selected', label: 'Selected', icon: <Check className="w-3 h-3" /> },
    { value: 'skipped', label: 'Skipped', icon: <X className="w-3 h-3" /> },
    { value: 'done', label: 'Done', icon: '✓' },
  ];

  return (
    <div className={`border rounded-lg p-3 ${
      option.status === 'selected' ? 'border-blue-300 bg-blue-50' :
      option.status === 'done' ? 'border-green-300 bg-green-50' :
      option.status === 'skipped' ? 'border-gray-300 bg-gray-50 opacity-60' :
      'border-gray-200 bg-white'
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" title={optionTypeLabels[option.option_type]}>
              {optionTypeIcons[option.option_type] || '📍'}
            </span>
            <span className="font-medium text-gray-800">{option.name}</span>

            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${optionStatusColors[option.status]}`}
              >
                {option.status.charAt(0).toUpperCase() + option.status.slice(1)}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => {
                        onStatusChange(option.id, status.value);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg ${
                        option.status === status.value ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <span className="w-4">{status.icon}</span>
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {option.description && (
            <p className="text-sm text-gray-600 mt-1 ml-7">{option.description}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-2 ml-7 text-xs text-gray-500">
            {option.estimated_duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(option.estimated_duration)}
              </span>
            )}
            {option.estimated_cost && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {Number(option.estimated_cost).toFixed(2)} {option.currency}
              </span>
            )}
            {option.url && (
              <a
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Link
              </a>
            )}
          </div>

          {option.notes && (
            <p className="text-xs text-gray-500 mt-2 ml-7 italic">{option.notes}</p>
          )}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => onEdit(option)}
            className="text-blue-600 hover:text-blue-700 p-1"
            title="Edit option"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(option.id)}
            className="text-red-600 hover:text-red-700 p-1"
            title="Delete option"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
