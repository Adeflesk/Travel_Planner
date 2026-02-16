'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { JourneySegment, JourneySegmentDraft, LocationRef, SegmentType, SegmentOption, SegmentOptionFormData, Activity, Expense, ActivityFormData, ExpenseFormData } from '@/lib/types';
import { journeySegmentApi, segmentOptionApi, activityApi, expenseApi } from '@/lib/api';
import { SegmentCard } from './SegmentCard';
import { SegmentOptionsManager } from './SegmentOptionsManager';
import { Button } from '@/components/ui/Button';
import { X, Plus, AlertCircle } from 'lucide-react';

interface SegmentManagerProps {
  journeyId: number;
  tripId: number;
}

const buildLocation = (id?: number, name?: string): LocationRef => {
  if (id) {
    return { type: 'destination', destination_id: id, name };
  }
  return { type: 'custom', name: name ?? '' };
};

const toDraft = (segment: JourneySegment): JourneySegmentDraft => ({
  segment_type: segment.segment_type,
  origin: buildLocation(segment.origin_id, segment.origin_name),
  destination: buildLocation(segment.destination_id, segment.destination_name),
  order: segment.order,
  start_datetime: segment.start_datetime,
  end_datetime: segment.end_datetime,
  origin_timezone: segment.origin_timezone,
  destination_timezone: segment.destination_timezone,
  metadata: segment.metadata ?? {},
  notes: undefined,
});

const toUpdatePayload = (draft: JourneySegmentDraft, order: number) => ({
  segment_type: draft.segment_type,
  origin_id: draft.origin.destination_id,
  origin_name: draft.origin.name || undefined,
  destination_id: draft.destination.destination_id,
  destination_name: draft.destination.name || undefined,
  start_datetime: draft.start_datetime,
  end_datetime: draft.end_datetime,
  origin_timezone: draft.origin_timezone,
  destination_timezone: draft.destination_timezone,
  metadata: draft.metadata ?? {},
  order,
});

// Activity Form Component
interface ActivityFormProps {
  segmentId: number;
  onAdd: (activity: ActivityFormData) => Promise<void>;
  onCancel: () => void;
}

function ActivityForm({ segmentId, onAdd, onCancel }: ActivityFormProps) {
  const [formData, setFormData] = useState<Partial<ActivityFormData>>({
    name: '',
    segment_id: segmentId,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name?.trim()) {
      setError('Activity name is required');
      return;
    }

    setIsLoading(true);
    try {
      await onAdd(formData as ActivityFormData);
      setFormData({ name: '', segment_id: segmentId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 rounded-md bg-slate-50 p-3 space-y-2">
      <input
        type="text"
        placeholder="Activity name"
        value={formData.name || ''}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="number"
        placeholder="Duration (minutes)"
        value={formData.duration ?? ''}
        onChange={(e) =>
          setFormData({ ...formData, duration: e.target.value ? parseInt(e.target.value) : undefined })
        }
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="number"
        placeholder="Cost ($)"
        value={formData.cost ?? ''}
        onChange={(e) =>
          setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })
        }
        step="0.01"
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      {error && (
        <div className="flex gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Activity'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Expense Form Component
interface ExpenseFormProps {
  segmentId: number;
  tripId: number;
  onAdd: (expense: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
}

function ExpenseForm({ segmentId, tripId, onAdd, onCancel }: ExpenseFormProps) {
  const initialDate = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState<Partial<ExpenseFormData>>({
    category: 'Food',
    amount: undefined,
    segment_id: segmentId,
    trip_id: tripId,
    date: initialDate,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.amount === undefined) {
      setError('Amount is required');
      return;
    }

    if (!formData.category) {
      setError('Category is required');
      return;
    }

    if (!formData.date) {
      setError('Date is required');
      return;
    }

    setIsLoading(true);
    try {
      await onAdd(formData as ExpenseFormData);
      setFormData({
        category: 'Food',
        amount: undefined,
        segment_id: segmentId,
        trip_id: tripId,
        date: initialDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 rounded-md bg-slate-50 p-3 space-y-2">
      <select
        value={formData.category || 'Food'}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      >
        <option>Food</option>
        <option>Transportation</option>
        <option>Accommodation</option>
        <option>Activity</option>
        <option>Shopping</option>
        <option>Other</option>
      </select>
      <input
        type="date"
        value={formData.date || ''}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="number"
        placeholder="Amount ($)"
        value={formData.amount ?? ''}
        onChange={(e) =>
          setFormData({ ...formData, amount: e.target.value ? parseFloat(e.target.value) : undefined })
        }
        step="0.01"
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="text"
        placeholder="Description"
        value={formData.description || ''}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      {error && (
        <div className="flex gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Expense'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function SegmentManager({ journeyId, tripId }: SegmentManagerProps) {
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSegment, setEditingSegment] = useState<JourneySegment | null>(null);
  const [editingDraft, setEditingDraft] = useState<JourneySegmentDraft | null>(null);
  const [segmentOptions, setSegmentOptions] = useState<SegmentOption[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const sortedSegments = useMemo(
    () => [...segments].sort((a, b) => a.order - b.order),
    [segments]
  );

  const loadSegments = useCallback(async () => {
    try {
      const response = await journeySegmentApi.getByJourneyId(journeyId);
      setSegments(response.data);
    } catch (error) {
      console.error('Error loading journey segments:', error);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const loadSegmentOptions = useCallback(async (segmentId: number) => {
    try {
      const response = await segmentOptionApi.getBySegmentId(segmentId);
      setSegmentOptions(response.data);
    } catch (error) {
      console.error('Error loading segment options:', error);
      setSegmentOptions([]);
    }
  }, []);

  const loadSegmentActivities = useCallback(async (segmentId: number) => {
    try {
      const response = await activityApi.getBySegmentId(segmentId);
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading segment activities:', error);
      setActivities([]);
    }
  }, []);

  const loadSegmentExpenses = useCallback(async (segmentId: number) => {
    try {
      const response = await expenseApi.getBySegmentId(segmentId);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error loading segment expenses:', error);
      setExpenses([]);
    }
  }, []);

  const openEditor = (segment: JourneySegment) => {
    setEditingSegment(segment);
    setEditingDraft(toDraft(segment));
    // Load options for transfer/bus/rail segments
    if (['TRANSFER', 'BUS', 'RAIL'].includes(segment.segment_type)) {
      loadSegmentOptions(segment.id);
    } else {
      setSegmentOptions([]);
    }
    
    // Load activities and expenses for STOP segments
    if (segment.segment_type === 'STOP') {
      loadSegmentActivities(segment.id);
      loadSegmentExpenses(segment.id);
    } else {
      setActivities([]);
      setExpenses([]);
    }
    
    setShowActivityForm(false);
    setShowExpenseForm(false);
  };

  const closeEditor = () => {
    setEditingSegment(null);
    setEditingDraft(null);
    setSegmentOptions([]);
    setActivities([]);
    setExpenses([]);
    setShowActivityForm(false);
    setShowExpenseForm(false);
  };

  const handleSave = async () => {
    if (!editingSegment || !editingDraft) return;

    try {
      const response = await journeySegmentApi.update(
        editingSegment.id,
        toUpdatePayload(editingDraft, editingSegment.order)
      );
      setSegments((prev) =>
        prev.map((segment) =>
          segment.id === editingSegment.id ? response.data : segment
        )
      );
      closeEditor();
    } catch (error) {
      console.error('Error updating journey segment:', error);
      alert('Failed to update segment');
    }
  };

  const updateDraftField = <K extends keyof JourneySegmentDraft>(
    field: K,
    value: JourneySegmentDraft[K]
  ) => {
    if (!editingDraft) return;
    setEditingDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateDraftLocation = (
    index: number,
    side: 'origin' | 'destination',
    name: string
  ) => {
    if (!editingDraft) return;
    const next = { ...editingDraft };
    next[side] = { ...next[side], name };
    setEditingDraft(next);
  };

  const updateDraftSegmentType = (index: number, segmentType: SegmentType) => {
    if (!editingDraft) return;
    setEditingDraft({ ...editingDraft, segment_type: segmentType });
  };

  const updateDraftFieldAt = (
    index: number,
    field: keyof JourneySegmentDraft,
    value: unknown
  ) => {
    updateDraftField(field, value as never);
  };

  const handleAddSegmentOption = async (option: SegmentOptionFormData) => {
    try {
      const response = await segmentOptionApi.create(option);
      setSegmentOptions((prev) => [...prev, response.data]);
    } catch (error) {
      console.error('Error adding segment option:', error);
      throw error;
    }
  };

  const handleUpdateSegmentOption = async (
    optionId: number,
    updates: Partial<SegmentOptionFormData>
  ) => {
    try {
      const response = await segmentOptionApi.update(optionId, updates);
      setSegmentOptions((prev) =>
        prev.map((opt) => (opt.id === optionId ? response.data : opt))
      );
    } catch (error) {
      console.error('Error updating segment option:', error);
      throw error;
    }
  };

  const handleDeleteSegmentOption = async (optionId: number) => {
    try {
      await segmentOptionApi.delete(optionId);
      setSegmentOptions((prev) => prev.filter((opt) => opt.id !== optionId));
    } catch (error) {
      console.error('Error deleting segment option:', error);
      throw error;
    }
  };

  const handleAddActivity = async (activityData: ActivityFormData) => {
    if (!editingSegment) return;
    try {
      const response = await activityApi.createForSegment(editingSegment.id, activityData);
      setActivities((prev) => [...prev, response.data]);
      setShowActivityForm(false);
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    try {
      await activityApi.delete(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  };

  const handleAddExpense = async (expenseData: ExpenseFormData) => {
    if (!editingSegment) return;
    try {
      const response = await expenseApi.createForSegment(editingSegment.id, expenseData);
      setExpenses((prev) => [...prev, response.data]);
      setShowExpenseForm(false);
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      await expenseApi.delete(expenseId);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading segments...</p>;
  }

  if (segments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">No segments yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sortedSegments.map((segment) => (
          <div
            key={segment.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {segment.segment_type}
                </div>
                <div className="text-sm text-slate-600">
                  {(segment.origin_name || 'Origin') + ' -> ' + (segment.destination_name || 'Destination')}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {segment.start_datetime || 'Start TBD'}
                  {' · '}
                  {segment.end_datetime || 'End TBD'}
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => openEditor(segment)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingSegment && editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 flex-shrink-0">
              <div>
                <div className="text-sm text-slate-500">Edit segment</div>
                <div className="text-lg font-semibold text-slate-900">
                  Segment {editingSegment.order + 1}
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <SegmentCard
                segment={editingDraft}
                index={editingSegment.order}
                isExpanded={true}
                onToggle={() => null}
                onUpdateType={updateDraftSegmentType}
                onUpdateLocation={updateDraftLocation}
                onUpdateField={updateDraftFieldAt}
                onRemove={() => null}
                canRemove={false}
              />

              {/* Transport Options for TRANSFER/BUS/RAIL segments */}
              {['TRANSFER', 'BUS', 'RAIL'].includes(editingSegment.segment_type) && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <SegmentOptionsManager
                    segmentId={editingSegment.id}
                    options={segmentOptions}
                    onAddOption={handleAddSegmentOption}
                    onUpdateOption={handleUpdateSegmentOption}
                    onDeleteOption={handleDeleteSegmentOption}
                  />
                </div>
              )}

              {/* Activities and Expenses for STOP segments */}
              {editingSegment.segment_type === 'STOP' && (
                <>
                  {/* Activities Section */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">Activities</h3>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowActivityForm(!showActivityForm)}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        {showActivityForm ? 'Cancel' : 'Add Activity'}
                      </Button>
                    </div>

                    {showActivityForm && (
                      <ActivityForm
                        segmentId={editingSegment.id}
                        onAdd={handleAddActivity}
                        onCancel={() => setShowActivityForm(false)}
                      />
                    )}

                    {activities.length === 0 ? (
                      <p className="text-xs text-slate-500">No activities yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {activities.map((activity) => (
                          <li
                            key={activity.id}
                            className="flex items-start gap-3 rounded-md bg-slate-50 p-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">
                                {activity.name}
                              </div>
                              {activity.duration && (
                                <div className="text-xs text-slate-500">
                                  Duration: {activity.duration} min
                                </div>
                              )}
                              {activity.cost && (
                                <div className="text-xs text-slate-500">
                                  Cost: ${activity.cost}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Expenses Section */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">Expenses</h3>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowExpenseForm(!showExpenseForm)}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        {showExpenseForm ? 'Cancel' : 'Add Expense'}
                      </Button>
                    </div>

                    {showExpenseForm && (
                      <ExpenseForm
                        segmentId={editingSegment.id}
                        tripId={tripId}
                        onAdd={handleAddExpense}
                        onCancel={() => setShowExpenseForm(false)}
                      />
                    )}

                    {expenses.length === 0 ? (
                      <p className="text-xs text-slate-500">No expenses yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {expenses.map((expense) => (
                          <li
                            key={expense.id}
                            className="flex items-start gap-3 rounded-md bg-slate-50 p-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">
                                {expense.description || expense.category}
                              </div>
                              <div className="text-xs text-slate-500">
                                ${expense.amount.toFixed(2)} {expense.currency}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 flex-shrink-0">
              <Button type="button" variant="secondary" onClick={closeEditor}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
