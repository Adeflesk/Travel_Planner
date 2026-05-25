'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { PreTripTaskRow } from './PreTripTaskRow';
import { usePreTripTasks } from './usePreTripTasks';

interface PreTripTaskListProps {
    tripId: number;
}

export function PreTripTaskList({ tripId }: PreTripTaskListProps) {
    const { tasks, loading, createTask, cycleStatus, updateTask, deleteTask } = usePreTripTasks(tripId);
    const [expanded, setExpanded] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newBookBy, setNewBookBy] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        setSaving(true);
        try {
            await createTask({
                title: newTitle.trim(),
                book_by_date: newBookBy || undefined,
                url: newUrl || undefined,
                status: 'pending',
            });
            setNewTitle('');
            setNewBookBy('');
            setNewUrl('');
            setShowAddForm(false);
        } finally {
            setSaving(false);
        }
    };

    const pendingCount = tasks.filter(t => t.status === 'pending').length;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Before you go</h3>
                    {pendingCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expanded && (
                <div className="px-6 pb-6 space-y-2">
                    {loading && <p className="text-sm text-slate-400">Loading...</p>}
                    {!loading && tasks.length === 0 && !showAddForm && (
                        <p className="text-sm text-slate-400 italic">No pre-trip tasks yet.</p>
                    )}
                    {tasks.map(task => (
                        <PreTripTaskRow
                            key={task.id}
                            task={task}
                            onCycleStatus={cycleStatus}
                            onUpdate={updateTask}
                            onDelete={deleteTask}
                        />
                    ))}

                    {showAddForm ? (
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                            <input
                                autoFocus
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                placeholder="Task title (e.g. Book Antelope Canyon Tour)"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                    value={newBookBy}
                                    onChange={e => setNewBookBy(e.target.value)}
                                    placeholder="Book by date"
                                />
                                <input
                                    type="url"
                                    className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                    value={newUrl}
                                    onChange={e => setNewUrl(e.target.value)}
                                    placeholder="Booking URL"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    disabled={saving || !newTitle.trim()}
                                    className="text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 px-4 py-1.5 rounded-lg disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Add task'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mt-1"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus className="w-4 h-4" /> Add task
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
