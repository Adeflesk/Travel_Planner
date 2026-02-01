'use client';

import { useState } from 'react';
import { JourneyStop, StopOption, StopOptionStatus } from '@/lib/types';
import { format } from 'date-fns';
import {
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
} from 'lucide-react';
import { StopOptionItem } from './StopOptionItem';
import { StopOptionForm } from './StopOptionForm';
import { useStopOptions } from './useJourneyStops';

interface JourneyStopItemProps {
  stop: JourneyStop;
  onEdit: (stop: JourneyStop) => void;
  onDelete: (stopId: number) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function JourneyStopItem({
  stop,
  onEdit,
  onDelete,
  dragHandleProps,
}: JourneyStopItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [editingOption, setEditingOption] = useState<StopOption | null>(null);

  const {
    options,
    loading: optionsLoading,
    addOption,
    updateOption,
    deleteOption,
    updateOptionStatus,
  } = useStopOptions(stop.id);

  const selectedCount = options.filter((o) => o.status === 'selected').length;
  const doneCount = options.filter((o) => o.status === 'done').length;

  const handleAddOption = async (data: Partial<StopOption>) => {
    await addOption(data as Omit<StopOption, 'id'>);
    setShowAddOption(false);
  };

  const handleUpdateOption = async (data: Partial<StopOption>) => {
    if (editingOption) {
      await updateOption(editingOption.id, data);
      setEditingOption(null);
    }
  };

  const handleStatusChange = async (optionId: number, status: StopOptionStatus) => {
    await updateOptionStatus(optionId, status);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Stop Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab text-gray-400 hover:text-gray-600 mt-1"
            >
              <GripVertical className="w-5 h-5" />
            </div>
          )}

          <div className="p-2 bg-orange-100 rounded-full text-orange-600">
            <MapPin className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-800">{stop.name}</h4>
                {stop.location && (
                  <p className="text-sm text-gray-500">{stop.location}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {options.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {doneCount > 0 && `${doneCount} done`}
                    {doneCount > 0 && selectedCount > 0 && ' · '}
                    {selectedCount > 0 && `${selectedCount} selected`}
                    {doneCount === 0 && selectedCount === 0 && `${options.length} options`}
                  </span>
                )}
                <button
                  onClick={() => onEdit(stop)}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Edit stop"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(stop.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Delete stop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time info */}
            {(stop.planned_arrival || stop.planned_departure) && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {stop.planned_arrival && (
                  <span>
                    Arrive: {format(new Date(stop.planned_arrival), 'MMM dd, HH:mm')}
                  </span>
                )}
                {stop.planned_departure && (
                  <span>
                    Depart: {format(new Date(stop.planned_departure), 'MMM dd, HH:mm')}
                  </span>
                )}
              </div>
            )}

            {stop.notes && (
              <p className="text-sm text-gray-500 mt-2">{stop.notes}</p>
            )}
          </div>
        </div>

        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 py-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Options
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {options.length > 0
                ? `Show ${options.length} Option${options.length !== 1 ? 's' : ''}`
                : 'Add Options'}
            </>
          )}
        </button>
      </div>

      {/* Options Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {optionsLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading options...</p>
          ) : (
            <>
              {/* Options List */}
              <div className="space-y-2 mb-4">
                {options.map((option) =>
                  editingOption?.id === option.id ? (
                    <StopOptionForm
                      key={option.id}
                      stopId={stop.id}
                      option={option}
                      onSubmit={handleUpdateOption}
                      onCancel={() => setEditingOption(null)}
                    />
                  ) : (
                    <StopOptionItem
                      key={option.id}
                      option={option}
                      onEdit={setEditingOption}
                      onDelete={deleteOption}
                      onStatusChange={handleStatusChange}
                    />
                  )
                )}
              </div>

              {/* Add Option Form or Button */}
              {showAddOption ? (
                <StopOptionForm
                  stopId={stop.id}
                  onSubmit={handleAddOption}
                  onCancel={() => setShowAddOption(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAddOption(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
