'use client';

import { useState } from 'react';
import { useJourneys, sortOptions } from './useJourneys';
import { useJourneyForm } from './useJourneyForm';
import { JourneyForm } from './JourneyForm';
import { JourneyItem } from './JourneyItem';
import { ArrowUpDown, Plus, X } from 'lucide-react';
import { useTripContext } from '@/lib/trip-context';
import type { Journey, JourneySegmentDraft } from '@/lib/types';
import { expenseApi } from '@/lib/api';

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

  const tripCtx = useTripContext();
  const [showForm, setShowForm] = useState(false);
  const [showReturnPrompt, setShowReturnPrompt] = useState<{ visible: boolean; journey?: Journey }>({ visible: false });
  const [costBannerSegments, setCostBannerSegments] = useState<JourneySegmentDraft[]>([]);

  const handleJourneySuccess = (newJourney?: Journey, submittedSegments?: JourneySegmentDraft[]) => {
    reload();
    setShowForm(false);
    if (newJourney && tripCtx?.context?.flight_type === 'return' && journeys.length === 0) {
      setShowReturnPrompt({ visible: true, journey: newJourney });
    }

    if (submittedSegments && submittedSegments.length > 0) {
      const segmentsWithCost = submittedSegments.filter((s) => s.metadata?.cost);
      if (segmentsWithCost.length > 0) {
        setCostBannerSegments(segmentsWithCost);
      }
    }
  };

  const handleLogAllCosts = async () => {
    for (const seg of costBannerSegments) {
      const meta = seg.metadata || {};
      const costAmount = meta.cost;
      if (!costAmount) continue;

      await expenseApi.create({
        trip_id: tripId,
        category: 'transport',
        amount: Number(costAmount),
        currency: String(meta.currency || tripCtx?.context?.budget_currency || 'USD'),
        description: `${seg.origin?.name || 'Origin'} → ${seg.destination?.name || 'Destination'}`,
        date: seg.start_datetime?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
        booked: Boolean(meta.booked),
        paid: Boolean(meta.paid),
      });
    }
    setCostBannerSegments([]);
  };

  const {
    formData,
    isEditing,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
    duplicateAsReturn,
  } = useJourneyForm(tripId, handleJourneySuccess);

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
          className={`relative z-10 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${shouldShowForm
              ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              : 'border-(--color-primary-600) bg-(--color-primary-600) text-white hover:bg-(--color-primary-700)'
            }`}
        >
          {shouldShowForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {shouldShowForm ? 'Cancel' : 'Add Journey'}
        </button>
      </div>

      {
        showReturnPrompt.visible && showReturnPrompt.journey && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-blue-900">Create return journey?</h4>
              <p className="text-sm text-blue-700">Since this is a return trip, would you like to auto-create the return journey?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReturnPrompt({ visible: false })}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-md"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowReturnPrompt({ visible: false });
                  duplicateAsReturn(showReturnPrompt.journey!);
                  setShowForm(true);
                }}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm"
              >
                Yes, create return
              </button>
            </div>
          </div>
        )
      }

      {
        costBannerSegments.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between">
            <span className="text-sm text-amber-800">
              {costBannerSegments.length} segment cost{costBannerSegments.length > 1 ? 's' : ''} recorded — log them as expenses?
            </span>
            <div className="flex gap-2">
              <button onClick={handleLogAllCosts} className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 font-medium shadow-sm">
                Log all
              </button>
              <button onClick={() => setCostBannerSegments([])} className="text-xs text-amber-700 hover:text-amber-900 px-2 font-medium">
                Dismiss
              </button>
            </div>
          </div>
        )
      }

      {
        !loading && journeys.length > 0 && (
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
        )
      }

      {
        shouldShowForm && (
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
        )
      }

      {
        loading ? (
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
        )
      }
    </div >
  );
}
