'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayActivity } from '@/lib/types';
import { dayApi } from '@/lib/api';
import { CheckCircle2, Circle, Trash2, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ActivityForm } from '@/components/days/ActivityForm';

interface DestinationActivityListProps {
  destinationId: number;
}

export function DestinationActivityList({ destinationId }: DestinationActivityListProps) {
  const [activities, setActivities] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Partial<DayActivity> | undefined>();

  const reload = useCallback(async () => {
    try {
      const res = await dayApi.getByDestination(destinationId);
      setActivities(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => { reload(); }, [reload]);

  const handleSave = async (data: Partial<DayActivity>) => {
    if (data.id) {
      await dayApi.updateActivity(data.id, data);
    } else {
      await dayApi.createActivity({ ...data, destination_id: destinationId, title: data.title ?? '' });
    }
    reload();
  };

  const handleDelete = async (id: number) => {
    await dayApi.deleteActivity(id);
    reload();
  };

  const handleToggle = async (activity: DayActivity) => {
    await dayApi.updateActivity(activity.id, { is_completed: !activity.is_completed });
    reload();
  };

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-2">
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No activities yet.</p>
      ) : (
        activities.map((a) => (
          <div key={a.id} className={`flex items-center gap-2 py-1.5 ${a.is_completed ? 'opacity-60' : ''}`}>
            <button onClick={() => handleToggle(a)} aria-label="Toggle complete">
              {a.is_completed
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <Circle className="w-4 h-4 text-gray-400" />}
            </button>
            <span
              className={`flex-1 text-sm cursor-pointer hover:text-sky-600 ${a.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
              onClick={() => { setEditingActivity(a); setIsFormOpen(true); }}
            >
              {a.title}
            </span>
            {a.start_time && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />{a.start_time}
              </span>
            )}
            <button onClick={() => handleDelete(a.id)} aria-label="Delete" className="text-red-500 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Plus />}
        onClick={() => { setEditingActivity(undefined); setIsFormOpen(true); }}
      >
        Add activity
      </Button>

      {isFormOpen && (
        <ActivityForm
          activity={editingActivity}
          dayId={0}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingActivity(undefined); }}
          onDelete={editingActivity?.id ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
