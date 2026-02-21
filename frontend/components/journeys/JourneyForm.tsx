

'use client';
import { useRouter } from 'next/navigation';
import { JourneyFormData } from '@/lib/types';
import { SegmentBuilder } from '@/components/journey-segments';
import { useTripContext } from '@/lib/trip-context';

interface JourneyFormProps {
  formData: JourneyFormData;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof JourneyFormData>(field: K, value: JourneyFormData[K]) => void;
}

export function JourneyForm({
  formData,
  isEditing,
  onSubmit,
  onCancel,
  updateField
}: JourneyFormProps) {
  const router = useRouter();
  const tripContext = useTripContext();

  if (!isEditing) {
    return (
      <form
        className="bg-gray-50 p-4 rounded-lg mb-4"
        onSubmit={async (e) => {
          await onSubmit(e);
          router.push && router.push(`/trips/${formData.trip_id}`);
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Add Journey</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
        <div className="mb-6">
          {/* Transport Mode Dropdown (required) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transport Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.transport_mode}
              onChange={e => updateField('transport_mode', e.target.value)}
              required
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
            >
              <option value="">Select a mode...</option>
              <option value="FLIGHT">Flight</option>
              <option value="RAIL">Rail</option>
              <option value="BUS">Bus</option>
              <option value="TRANSFER">Transfer</option>
              <option value="CAR">Car</option>
              <option value="FERRY">Ferry</option>
              <option value="WALK">Walk</option>
              <option value="BIKE">Bike</option>
              <option value="OTHER">Other</option>
            </select>
            {/* Error message for transport_mode */}
            {formData.transport_mode === '' && (
              <div className="text-red-500 text-xs mt-1">Transport mode is required.</div>
            )}
          </div>
          <SegmentBuilder
            segments={formData.segments || []}
            onChange={(segments) => updateField('segments', segments)}
            defaultTimezone={tripContext?.timezone || formData.origin_timezone || 'UTC'}
            startDate={tripContext?.startDate ? new Date(tripContext.startDate) : undefined}
          />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              disabled={formData.transport_mode === ''}
            >
              Save Journey
            </button>
          </div>
        </div>
      </form>
    );
  }
  return null;
}
