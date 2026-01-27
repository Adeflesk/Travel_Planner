// components/ActivityList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, ActivityFormData } from '@/lib/types';
import { activityApi } from '@/lib/api';
import { format } from 'date-fns';
import { Trash2, Edit2, CheckCircle2, Circle, Calendar, ListTodo } from 'lucide-react';

interface ActivityListProps {
  destinationId: number;
}

export default function ActivityList({ destinationId }: ActivityListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    destination_id: destinationId,
    name: '',
    description: '',
    activity_type: '',
    scheduled_date: '',
    is_todo: false,
    is_completed: false,
  });

  const loadActivities = useCallback(async () => {
    try {
      const response = await activityApi.getByDestinationId(destinationId);
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await activityApi.update(editingId, formData);
        setEditingId(null);
      } else {
        await activityApi.create(formData);
      }
      setFormData({
        destination_id: destinationId,
        name: '',
        description: '',
        activity_type: '',
        scheduled_date: '',
        is_todo: false,
        is_completed: false,
      });
      loadActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity');
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setFormData({
      destination_id: destinationId,
      name: activity.name,
      description: activity.description || '',
      activity_type: activity.activity_type || '',
      scheduled_date: activity.scheduled_date || '',
      is_todo: activity.is_todo,
      is_completed: activity.is_completed,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      destination_id: destinationId,
      name: '',
      description: '',
      activity_type: '',
      scheduled_date: '',
      is_todo: false,
      is_completed: false,
    });
  };

  const handleToggleCompleted = async (activity: Activity) => {
    try {
      await activityApi.update(activity.id, {
        is_completed: !activity.is_completed,
      });
      loadActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this activity?')) {
      try {
        await activityApi.delete(id);
        loadActivities();
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  const scheduledActivities = activities.filter((a) => !a.is_todo);
  const todoActivities = activities.filter((a) => a.is_todo);
  const completedCount = todoActivities.filter((a) => a.is_completed).length;

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-3">
          {editingId ? 'Edit Activity' : 'Add Activity'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Activity name"
            required
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
          />
          <input
            type="date"
            value={formData.scheduled_date}
            onChange={(e) =>
              setFormData({ ...formData, scheduled_date: e.target.value })
            }
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
            disabled={formData.is_todo}
          />
        </div>

        <div className="mt-3">
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Description (optional)"
            rows={2}
            className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body resize-none"
          />
        </div>

        <div className="mt-3 flex gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_todo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_todo: e.target.checked,
                  scheduled_date: e.target.checked ? '' : formData.scheduled_date,
                })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Mark as todo item
            </span>
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {editingId ? 'Update Activity' : 'Add Activity'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-center text-gray-500 py-4">
          No activities yet. Add scheduled activities or todos!
        </p>
      ) : (
        <div className="space-y-6">
          {/* Scheduled Activities */}
          {scheduledActivities.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Scheduled Activities</span>
                <span className="text-sm text-gray-500">
                  ({scheduledActivities.length})
                </span>
              </h4>
              <div className="space-y-2">
                {scheduledActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex justify-between items-start border border-gray-200 p-3 rounded-lg bg-white hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {activity.name}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      )}
                      {activity.scheduled_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          📅{' '}
                          {format(new Date(activity.scheduled_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(activity)}
                        className="text-blue-600 hover:text-blue-700 p-2"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Todo Items */}
          {todoActivities.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-green-600" />
                <span>Todo Checklist</span>
                <span className="text-sm text-gray-500">
                  ({completedCount}/{todoActivities.length} completed)
                </span>
              </h4>
              <div className="space-y-2">
                {todoActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition ${
                      activity.is_completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggleCompleted(activity)}
                        className="focus:outline-none"
                      >
                        {activity.is_completed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            activity.is_completed
                              ? 'line-through text-gray-500'
                              : 'text-gray-800'
                          }`}
                        >
                          {activity.name}
                        </p>
                        {activity.description && !activity.is_completed && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(activity)}
                        className="text-blue-600 hover:text-blue-700 p-2"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
