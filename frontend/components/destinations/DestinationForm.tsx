'use client';

import { DestinationFormData } from '@/lib/types';
import { LocationSearchBox } from '@/components/shared/LocationSearchBox';
import type { LocationSearchResult } from '@/components/shared/LocationSearchBox';

interface DestinationFormProps {
  formData: DestinationFormData;
  isEditing: boolean;
  isSubmitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
  ) => void;
  onLocationRetrieve: (result: LocationSearchResult) => void;
}

export function DestinationForm({
  formData,
  isEditing,
  isSubmitting = false,
  onSubmit,
  onCancel,
  updateField,
  onLocationRetrieve,
}: DestinationFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-3">
        {isEditing ? 'Edit Destination' : 'Add Destination'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">City/Place</label>
          <LocationSearchBox
            value={formData.name}
            placeholder="e.g., Paris, Tokyo"
            onTextChange={(text) => updateField('name', text)}
            onRetrieve={onLocationRetrieve}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Country <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => updateField('country', e.target.value)}
            placeholder="e.g., France, Japan"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Region/State <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.region}
            onChange={(e) => updateField('region', e.target.value || '')}
            placeholder="e.g., Île-de-France, Kanto"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Timezone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.timezone || ''}
            onChange={(e) => updateField('timezone', e.target.value)}
            placeholder="e.g., America/Denver"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Arrival Date</label>
          <input
            type="date"
            value={formData.arrival_date}
            onChange={(e) => updateField('arrival_date', e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Departure Date</label>
          <input
            type="date"
            value={formData.departure_date}
            onChange={(e) => updateField('departure_date', e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving\u2026' : (isEditing ? 'Update Destination' : 'Add Destination')}
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
