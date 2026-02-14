'use client';

import { useState } from 'react';
import { JourneyOption, JourneyOptionFormData, OptionStatus } from '@/lib/types';
import { Plus, X, Check, ExternalLink } from 'lucide-react';

interface JourneyOptionsPanelProps {
  journeyId: number;
  options: JourneyOption[];
  onAddOption: (data: JourneyOptionFormData) => Promise<void>;
  onUpdateOption: (id: number, data: Partial<JourneyOptionFormData>) => Promise<void>;
  onDeleteOption: (id: number) => Promise<void>;
  onSelectOption: (id: number) => Promise<void>;
}

export function JourneyOptionsPanel({
  journeyId,
  options,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onSelectOption,
}: JourneyOptionsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<JourneyOptionFormData>>({
    journey_id: journeyId,
    name: '',
    carrier: '',
    transport_mode: '',
    frequency: '',
    estimated_duration: undefined,
    cost: undefined,
    currency: 'USD',
    booking_url: '',
    notes: '',
    status: 'researching',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingId) {
        await onUpdateOption(editingId, formData);
        setEditingId(null);
      } else {
        await onAddOption(formData as JourneyOptionFormData);
        setIsAdding(false);
      }
      // Reset form
      setFormData({
        journey_id: journeyId,
        name: '',
        carrier: '',
        transport_mode: '',
        frequency: '',
        estimated_duration: undefined,
        cost: undefined,
        currency: 'USD',
        booking_url: '',
        notes: '',
        status: 'researching',
      });
    } catch (error) {
      console.error('Failed to save option:', error);
    }
  };

  const handleEdit = (option: JourneyOption) => {
    setEditingId(option.id);
    setFormData({
      journey_id: option.journey_id,
      name: option.name,
      carrier: option.carrier || '',
      transport_mode: option.transport_mode || '',
      frequency: option.frequency || '',
      estimated_duration: option.estimated_duration,
      cost: option.cost,
      currency: option.currency,
      booking_url: option.booking_url || '',
      notes: option.notes || '',
      status: option.status,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      journey_id: journeyId,
      name: '',
      carrier: '',
      transport_mode: '',
      frequency: '',
      estimated_duration: undefined,
      cost: undefined,
      currency: 'USD',
      booking_url: '',
      notes: '',
      status: 'researching',
    });
  };

  const getStatusBadge = (status: OptionStatus) => {
    const styles = {
      researching: 'bg-gray-100 text-gray-700',
      selected: 'bg-green-100 text-green-700',
      booked: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels = {
      researching: 'Researching',
      selected: 'Selected',
      booked: 'Booked',
      rejected: 'Rejected',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  return (
    <div className="space-y-3">
      {/* Option List */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={option.id}
              className={`border rounded-lg p-4 ${
                option.status === 'selected'
                  ? 'border-green-300 bg-green-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-semibold text-slate-900">{option.name}</h5>
                    {getStatusBadge(option.status)}
                  </div>
                  {option.carrier && (
                    <p className="text-sm text-slate-600">{option.carrier}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                    {option.frequency && (
                      <span>🔄 {option.frequency}</span>
                    )}
                    {option.estimated_duration && (
                      <span>⏱️ {formatDuration(option.estimated_duration)}</span>
                    )}
                    {option.cost && (
                      <span className="font-medium text-slate-900">
                        {formatCurrency(option.cost, option.currency)}
                      </span>
                    )}
                  </div>
                  {option.notes && (
                    <p className="text-sm text-slate-500 mt-2">{option.notes}</p>
                  )}
                  {option.booking_url&& (
                    <a
                      href={option.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 mt-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View booking link
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  {option.status !== 'selected' && option.status !== 'booked' && (
                    <button
                      onClick={() => onSelectOption(option.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Select this option"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(option)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteOption(option.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
          <h5 className="font-semibold text-slate-900">
            {editingId ? 'Edit Booking' : 'Add Booking'}
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Airlink Express Bus"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Carrier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrier/Company <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                placeholder="e.g., Dublin Bus"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Transport Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Mode <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={formData.transport_mode}
                onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">Select...</option>
                <option value="bus">Bus</option>
                <option value="train">Train</option>
                <option value="shuttle">Shuttle</option>
                <option value="taxi">Taxi</option>
                <option value="uber">Uber/Rideshare</option>
                <option value="car">Rental Car</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="e.g., Every 30 min"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={formData.estimated_duration || ''}
                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="e.g., 45"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Booking URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.booking_url}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Pros/cons, additional details..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              {editingId ? 'Update Booking' : 'Add Booking'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Booking Option
        </button>
      )}
    </div>
  );
}
