'use client';

import { useExpenses } from './useExpenses';
import { useExpenseForm } from './useExpenseForm';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';
import { ExpenseSummary } from './ExpenseSummary';

interface ExpenseListProps {
  tripId: number;
}

export default function ExpenseList({ tripId }: ExpenseListProps) {
  const {
    expenses,
    loading,
    totalExpenses,
    expensesByCategory,
    reload,
    deleteExpense,
  } = useExpenses(tripId);

  const {
    formData,
    isEditing,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
  } = useExpenseForm(tripId, reload);

  const handleDelete = async (id: number) => {
    if (confirm('Delete this expense?')) {
      await deleteExpense(id);
    }
  };

  return (
    <div>
      <ExpenseForm
        formData={formData}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        updateField={updateField}
      />

      <ExpenseSummary
        totalExpenses={totalExpenses}
        expensesByCategory={expensesByCategory}
      />

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No expenses yet</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
