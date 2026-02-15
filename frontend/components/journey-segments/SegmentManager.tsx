'use client';

import { useEffect, useMemo, useState } from 'react';
import { JourneySegment, JourneySegmentDraft, LocationRef, SegmentType } from '@/lib/types';
import { journeySegmentApi } from '@/lib/api';
import { SegmentCard } from './SegmentCard';
import { Button } from '@/components/ui/Button';

interface SegmentManagerProps {
  journeyId: number;
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

export default function SegmentManager({ journeyId }: SegmentManagerProps) {
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSegment, setEditingSegment] = useState<JourneySegment | null>(null);
  const [editingDraft, setEditingDraft] = useState<JourneySegmentDraft | null>(null);

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

  const openEditor = (segment: JourneySegment) => {
    setEditingSegment(segment);
    setEditingDraft(toDraft(segment));
  };

  const closeEditor = () => {
    setEditingSegment(null);
    setEditingDraft(null);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
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
            <div className="p-4">
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
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
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
