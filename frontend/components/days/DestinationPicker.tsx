'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, Plus, X, AlertCircle } from 'lucide-react';
import { TripDay, Destination } from '@/lib/types';
import { destinationApi, dayApi } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode-utils';

interface DestinationPickerProps {
    day: TripDay;
    tripId: number;
    onDestinationChanged: () => void;
}

export const DestinationPicker = ({ day, tripId, onDestinationChanged }: DestinationPickerProps) => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCountry, setNewCountry] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Fetch destinations for this trip
    useEffect(() => {
        destinationApi.getByTripId(tripId)
            .then(res => setDestinations(res.data))
            .catch(console.error);
    }, [tripId]);

    // Close popover on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowCreateForm(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const openPopover = () => {
        setError(null);
        setIsOpen(v => !v);
    };

    const currentDestination = destinations.find(d => d.id === day.destination_id);

    const linkDestination = async (dest: Destination) => {
        setIsSaving(true);
        setError(null);
        try {
            await dayApi.updateDay(day.id, {
                destination_id: dest.id,
                location: dest.name,
            });
            setIsOpen(false);
            onDestinationChanged();
        } catch (e) {
            console.error('Failed to link destination', e);
            setError('Failed to link destination. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const unlinkDestination = async () => {
        setIsSaving(true);
        setError(null);
        try {
            // Only clear destination_id — leave location as the user may have set it independently
            await dayApi.updateDay(day.id, { destination_id: null });
            setIsOpen(false);
            onDestinationChanged();
        } catch (e) {
            console.error('Failed to unlink destination', e);
            setError('Failed to unlink destination. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsCreating(true);
        setError(null);
        try {
            const res = await destinationApi.create({
                trip_id: tripId,
                name: newName.trim(),
                country: newCountry.trim() || undefined,
            });
            const dest = res.data;

            // Link day to new destination
            await dayApi.updateDay(day.id, {
                destination_id: dest.id,
                location: dest.name,
            });

            // Optimistic update of the local list so reopening the popover shows the new entry
            setDestinations(prev => [...prev, dest]);

            // Background geocode
            const address = [newName.trim(), newCountry.trim()].filter(Boolean).join(', ');
            geocodeAddress(address).then(coords => {
                if (coords) {
                    destinationApi.update(dest.id, {
                        latitude: coords.lat,
                        longitude: coords.lng,
                    }).catch(console.error);
                }
            });

            setNewName('');
            setNewCountry('');
            setShowCreateForm(false);
            setIsOpen(false);
            onDestinationChanged();
        } catch (e) {
            console.error('Failed to create destination', e);
            setError('Failed to create destination. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            {/* Badge / trigger */}
            <button
                onClick={openPopover}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors disabled:opacity-60"
            >
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {currentDestination
                    ? <span>{currentDestination.name}{currentDestination.country ? `, ${currentDestination.country}` : ''}</span>
                    : <span className="text-slate-400">No destination</span>
                }
                <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-30 overflow-hidden">
                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Destination list */}
                    <div className="py-1 max-h-48 overflow-y-auto">
                        {destinations.length === 0 && (
                            <p className="px-4 py-3 text-sm text-slate-400">No destinations yet</p>
                        )}
                        {destinations.map(dest => (
                            <button
                                key={dest.id}
                                onClick={() => linkDestination(dest)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors"
                            >
                                <Check className={`w-4 h-4 shrink-0 ${dest.id === day.destination_id ? 'text-sky-600' : 'invisible'}`} />
                                <span className="font-medium text-slate-800">{dest.name}</span>
                                {dest.country && <span className="text-slate-400 text-xs ml-auto">{dest.country}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Unlink option */}
                    {day.destination_id && (
                        <div className="border-t border-slate-100">
                            <button
                                onClick={unlinkDestination}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Unlink destination
                            </button>
                        </div>
                    )}

                    {/* Create new */}
                    <div className="border-t border-slate-100">
                        {!showCreateForm ? (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-sky-600 hover:bg-sky-50 transition-colors font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                New destination&hellip;
                            </button>
                        ) : (
                            <div className="p-3 space-y-2">
                                <input
                                    autoFocus
                                    placeholder="City name *"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
                                />
                                <input
                                    placeholder="Country (optional)"
                                    value={newCountry}
                                    onChange={e => setNewCountry(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim() || isCreating}
                                        className="flex-1 py-1.5 text-sm font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isCreating ? 'Creating\u2026' : 'Create'}
                                    </button>
                                    <button
                                        onClick={() => { setShowCreateForm(false); setNewName(''); setNewCountry(''); }}
                                        className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
