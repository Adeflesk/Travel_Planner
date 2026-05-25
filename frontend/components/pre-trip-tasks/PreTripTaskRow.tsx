'use client';

import { useState } from 'react';
import { PreTripTask, PreTripTaskUpdate } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface PreTripTaskRowProps {
    task: PreTripTask;
    onCycleStatus: (task: PreTripTask) => void;
    onUpdate: (taskId: number, data: PreTripTaskUpdate) => void; // reserved for future inline edit
    onDelete: (taskId: number) => void;
}

const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-700',
    booked:  'bg-sky-100 text-sky-700',
    paid:    'bg-emerald-100 text-emerald-700',
};

export function PreTripTaskRow({ task, onCycleStatus, onUpdate, onDelete }: PreTripTaskRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <button
                    type="button"
                    className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide ${STATUS_STYLES[task.status]}`}
                    onClick={e => { e.stopPropagation(); onCycleStatus(task); }}
                    title="Click to advance status"
                >
                    {task.status}
                </button>
                <p className="flex-1 text-sm font-medium text-slate-800 truncate">{task.title}</p>
                {task.book_by_date && (
                    <span className="text-xs text-slate-400 shrink-0">by {task.book_by_date}</span>
                )}
                <span className="text-slate-300 text-sm">{expanded ? '▲' : '▼'}</span>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2 bg-slate-50/50">
                    {task.description && (
                        <p className="text-sm text-slate-600">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        {task.url && (
                            <a
                                href={task.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sky-600 hover:underline"
                                onClick={e => e.stopPropagation()}
                            >
                                <ExternalLink className="w-3 h-3" /> Book link
                            </a>
                        )}
                        {task.cost != null && (
                            <span>Est. {task.currency || ''} {task.cost.toFixed(2)}</span>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-xs text-rose-400 hover:text-rose-600"
                            onClick={() => onDelete(task.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
