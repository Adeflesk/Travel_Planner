'use client';

import { useActivities } from './useActivities';
import { useActivityForm } from './useActivityForm';
import { ActivityForm } from './ActivityForm';
import { ScheduledActivities } from './ScheduledActivities';
import { TodoActivities } from './TodoActivities';

interface ActivityListProps {
  destinationId: number;
}

export default function ActivityList({ destinationId }: ActivityListProps) {
  const {
    activities,
    scheduled,
    todos,
    completedCount,
    loading,
    reload,
    toggleCompleted,
    deleteActivity,
  } = useActivities(destinationId);

  const {
    formData,
    isEditing,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  } = useActivityForm(destinationId, reload);

  const handleDelete = async (id: number) => {
    if (confirm('Delete this activity?')) {
      await deleteActivity(id);
    }
  };

  return (
    <div>
      <ActivityForm
        formData={formData}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        updateField={updateField}
      />

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-center text-gray-500 py-4">
          No activities yet. Add scheduled activities or todos!
        </p>
      ) : (
        <div className="space-y-6">
          <ScheduledActivities
            activities={scheduled}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
          <TodoActivities
            activities={todos}
            completedCount={completedCount}
            onEdit={startEdit}
            onDelete={handleDelete}
            onToggleCompleted={toggleCompleted}
          />
        </div>
      )}
    </div>
  );
}
