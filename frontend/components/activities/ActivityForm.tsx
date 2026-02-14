'use client';

import { ActivityFormData } from '@/lib/types';
import { useTripContext } from '@/lib/trip-context';
import { getDateConstraints } from '@/lib/date-constraints';

interface ActivityFormProps {
  formData: ActivityFormData;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof ActivityFormData>(
    field: K,
    value: ActivityFormData[K]
  ) => void;
}

export function ActivityForm({
  formData,
  isEditing,
  onSubmit,
  onCancel,
  updateField,
}: ActivityFormProps) {
  // Get trip context for date constraints
  const tripContext = useTripContext();
  
  const dateConstraints = getDateConstraints(
    tripContext?.startDate,
    tripContext?.endDate,
    {
      allowBeforeStart: false,
      allowAfterEnd: false,
      defaultTo: 'start',
    }
  );

  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-3">
        {isEditing ? 'Edit Activity' : 'Add Activity'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Activity name"
          required
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
        />
        <input
          type="date"
          value={formData.scheduled_date}
          onChange={(e) => updateField('scheduled_date', e.target.value)}
          min={dateConstraints.min}
          max={dateConstraints.max}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          disabled={formData.is_todo}
        />
      </div>

      <div className="mt-3">
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400 resize-none"
        />
      </div>

      <div className="mt-3 flex gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_todo}
            onChange={(e) => {
              updateField('is_todo', e.target.checked);
              if (e.target.checked) {
                updateField('scheduled_date', '');
              }
            }}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Mark as todo item
          </span>
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {isEditing ? 'Update Activity' : 'Add Activity'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
