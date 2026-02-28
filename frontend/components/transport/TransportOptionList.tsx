'use client';

import { useState } from 'react';
import { TripTransport, TransportOption, TransportOptionCreate } from '@/lib/types';
import { transportOptionApi } from '@/lib/api';
import { Plus } from 'lucide-react';
import { TransportOptionForm } from './TransportOptionForm';

interface TransportOptionListProps {
  transport: TripTransport;
  onReload: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  researching: 'bg-slate-100 text-slate-600',
  selected: 'bg-sky-100 text-sky-700',
  booked: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-50 text-red-400 line-through',
};

export function TransportOptionList({ transport, onReload }: TransportOptionListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<TransportOption | null>(null);

  const handleSelect = async (option: TransportOption) => {
    const newStatus = option.status === 'selected' ? 'researching' : 'selected';
    try {
      await transportOptionApi.update(option.id, { status: newStatus });
      onReload();
    } catch (err) {
      console.error('Error updating option status:', err);
    }
  };

  const handleDelete = async (optionId: number) => {
    try {
      await transportOptionApi.delete(optionId);
      onReload();
    } catch (err) {
      console.error('Error deleting option:', err);
    }
  };

  const handleSaveNew = async (data: TransportOptionCreate) => {
    try {
      await transportOptionApi.create(transport.id, data);
      setShowForm(false);
      onReload();
    } catch (err) {
      console.error('Error creating option:', err);
    }
  };

  const handleSaveEdit = async (data: TransportOptionCreate) => {
    if (!editingOption) return;
    try {
      await transportOptionApi.update(editingOption.id, data);
      setEditingOption(null);
      onReload();
    } catch (err) {
      console.error('Error updating option:', err);
    }
  };

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
        Options ({transport.options?.length ?? 0})
      </p>
      <div className="space-y-1.5">
        {transport.options?.map((option) => (
          <div
            key={option.id}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
          >
            <button
              onClick={() => handleSelect(option)}
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                option.status === 'selected' || option.status === 'booked'
                  ? 'border-sky-500 bg-sky-500'
                  : 'border-slate-300 bg-white'
              }`}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-800">{option.name}</span>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                {option.duration_minutes != null && (
                  <span>{Math.floor(option.duration_minutes / 60)}h {option.duration_minutes % 60}m</span>
                )}
                {option.cost != null && (
                  <span>{option.cost} {option.currency ?? ''}</span>
                )}
                {option.frequency && <span>{option.frequency}</span>}
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[option.status] ?? STATUS_STYLE.researching}`}
            >
              {option.status}
            </span>
            <button
              onClick={() => setEditingOption(option)}
              className="text-xs text-slate-400 hover:text-sky-600 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(option.id)}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <TransportOptionForm
          transportType={transport.transport_type}
          onSave={handleSaveNew}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingOption && (
        <TransportOptionForm
          transportType={transport.transport_type}
          initialData={editingOption}
          onSave={handleSaveEdit}
          onCancel={() => setEditingOption(null)}
        />
      )}

      {!showForm && !editingOption && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add option
        </button>
      )}
    </div>
  );
}
