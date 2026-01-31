'use client';

import { useJourneys } from './useJourneys';
import { useJourneyForm } from './useJourneyForm';
import { JourneyForm } from './JourneyForm';
import { JourneyItem } from './JourneyItem';

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
