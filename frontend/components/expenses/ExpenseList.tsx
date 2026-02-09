'use client';

import { useExpenses } from './useExpenses';
import { useExpenseForm } from './useExpenseForm';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';
import { ExpenseSummary } from './ExpenseSummary';
import BudgetExceededModal from './BudgetExceededModal';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
    budgetImpact,
    handleSubmit,
    confirmSubmit,
    cancelBudgetAlert,
    startEdit,
    resetForm,
    updateField,
  } = useExpenseForm(tripId, reload);

  const [showExpenses, setShowExpenses] = useState(true);

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

      <button
        onClick={() => setShowExpenses((prev) => !prev)}
        className="mt-4 mb-2 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2"
        aria-expanded={showExpenses}
      >
        {showExpenses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {showExpenses ? 'Hide expenses' : 'Show expenses'}
      </button>

      {showExpenses && (
        <>
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
        </>
      )}

      {budgetImpact && (
        <BudgetExceededModal
          impact={budgetImpact}
          onConfirm={confirmSubmit}
          onCancel={cancelBudgetAlert}
        />
      )}
    </div>
  );
}
