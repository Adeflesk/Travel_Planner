'use client';

import { useDestinations } from './useDestinations';
import { useDestinationForm } from './useDestinationForm';
import { DestinationForm } from './DestinationForm';
import { DestinationItem } from './DestinationItem';
import { useTripContext } from '@/lib/trip-context';

interface DestinationListProps {
  tripId: number;
}

export default function DestinationList({ tripId }: DestinationListProps) {
  const tripContext = useTripContext();
  const {
    destinations,
    loading,
    expandedId,
    reload,
    deleteDestination,
    toggleExpanded,
  } = useDestinations(tripId);

  const {
    formData,
    isEditing,
    isSubmitting,
    handleSubmit,
    handleLocationRetrieve,
    startEdit,
    resetForm,
    updateField,
    locationWarning,
  } = useDestinationForm(
    tripId,
    reload,
    tripContext?.startDate,
    tripContext?.endDate,
    tripContext?.timezone
  );

  const handleDelete = async (id: number) => {
    if (confirm('Delete this destination?')) {
      await deleteDestination(id);
    }
  };

  return (
    <div>
      <DestinationForm
        formData={formData}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        locationWarning={locationWarning}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        updateField={updateField}
        onLocationRetrieve={handleLocationRetrieve}
      />

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : destinations.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No destinations yet</p>
      ) : (
        <div className="space-y-3">
          {destinations.map((dest) => (
            <DestinationItem
              key={dest.id}
              destination={dest}
              isExpanded={expandedId === dest.id}
              onEdit={startEdit}
              onDelete={handleDelete}
              onToggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
