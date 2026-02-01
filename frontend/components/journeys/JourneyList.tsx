'use client';

import { useJourneys, sortOptions } from './useJourneys';
import { useJourneyForm } from './useJourneyForm';
import { JourneyForm } from './JourneyForm';
import { JourneyItem } from './JourneyItem';
import { ArrowUpDown } from 'lucide-react';

interface JourneyListProps {
  tripId: number;
}

export default function JourneyList({ tripId }: JourneyListProps) {
  const {
    journeys,
    destinations,
    loading,
    reload,
    deleteJourney,
    getDestinationName,
    sortOption,
    setSortOption,
  } = useJourneys(tripId);

  const {
    formData,
    isEditing,
    errors,
    warnings,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
    duplicateAsReturn,
  } = useJourneyForm(tripId, reload);

  const handleDelete = async (id: number) => {
    if (confirm('Delete this journey?')) {
      await deleteJourney(id);
    }
  };

  return (
    <div>
      <JourneyForm
        formData={formData}
        isEditing={isEditing}
        destinations={destinations}
        errors={errors}
        warnings={warnings}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        updateField={updateField}
      />

      {!loading && journeys.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : journeys.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">No journeys yet</p>
          <p className="text-sm text-gray-400">
            Add journeys to track your travel between destinations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((journey) => (
            <JourneyItem
              key={journey.id}
              journey={journey}
              getDestinationName={getDestinationName}
              onEdit={startEdit}
              onDelete={handleDelete}
              onDuplicateReturn={duplicateAsReturn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
