'use client';

import { useMemo } from 'react';
import { useTripForm } from './useTripForm';
import { Input, Textarea } from '@/components/ui/Input';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { Button } from '@/components/ui/Button';
import { DollarSign } from 'lucide-react';
import { getSupportedTimezones } from '@/lib/timezone-utils';

interface TripFormProps {
  onTripCreated: () => void;
  onCancel?: () => void;
}

export default function TripForm({ onTripCreated, onCancel }: TripFormProps) {
  const { formData, loading, handleSubmit, handleChange, updateField } = useTripForm(onTripCreated);
  const timezones = useMemo(() => getSupportedTimezones(), []);

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">
        Create New Trip
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Trip Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Summer Europe Adventure"
          />

          <Input
            label="Budget"
            type="number"
            name="budget"
            value={formData.budget || ''}
            onChange={handleChange}
            step="0.01"
            placeholder="e.g., 5000"
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Warning Threshold (%)"
            type="number"
            name="budget_warning_threshold"
            value={formData.budget_warning_threshold ?? 75}
            onChange={handleChange}
            min={1}
            max={99}
            placeholder="75"
          />

          <Input
            label="Danger Threshold (%)"
            type="number"
            name="budget_danger_threshold"
            value={formData.budget_danger_threshold ?? 90}
            onChange={handleChange}
            min={2}
            max={100}
            placeholder="90"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />

          <Input
            label="End Date"
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AutocompleteInput
            label="Trip Timezone"
            name="timezone"
            value={formData.timezone || ''}
            onChange={(e) => updateField('timezone', e.target.value)}
            onSelect={(value) => updateField('timezone', value)}
            suggestions={timezones}
            filterMethod="contains"
            showRecentFirst={false}
            virtualize
            placeholder="Search timezones (e.g., America/Denver)"
            hint="Used for date and time display across the trip."
          />
        </div>

        <Textarea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Describe your trip..."
        />

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            loading={loading}
          >
            {loading ? 'Creating...' : 'Create Trip'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
