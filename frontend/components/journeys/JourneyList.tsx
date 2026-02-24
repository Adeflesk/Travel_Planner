'use client';

import { useState } from 'react';
import { useJourneys, sortOptions } from './useJourneys';
import { useJourneyForm } from './useJourneyForm';
import { JourneyForm } from './JourneyForm';
import { JourneyItem } from './JourneyItem';
import { ArrowUpDown, Plus, X } from 'lucide-react';

interface JourneyListProps {
  tripId: number;
}

export default function JourneyList({ tripId }: JourneyListProps) {
  const {
    journeys,
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
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
    duplicateAsReturn,
  } = useJourneyForm(tripId, reload);

  const [showForm, setShowForm] = useState(false);
  const shouldShowForm = showForm || isEditing;

  const handleDelete = async (id: number) => {
    if (confirm('Delete this journey?')) {
      await deleteJourney(id);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Journeys</h3>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          type="button"
          className={`relative z-10 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
            shouldShowForm
              ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              : 'border-[color:var(--color-primary-600)] bg-[color:var(--color-primary-600)] text-white hover:bg-[color:var(--color-primary-700)]'
          }`}
        >
          {shouldShowForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {shouldShowForm ? 'Cancel' : 'Add Journey'}
        </button>
      </div>

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

      {shouldShowForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <JourneyForm
            formData={formData}
            isEditing={isEditing}
            onSubmit={handleSubmit}
            onCancel={() => {
              resetForm();
              setShowForm(false);
            }}
            updateField={updateField}
          />
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
