'use client';

import { useState, useEffect, useCallback } from 'react';
import { TripShare } from '@/lib/types';
import { tripShareApi } from '@/lib/api';
import { X, UserPlus, Trash2, Users } from 'lucide-react';

interface ShareTripModalProps {
  tripId: number;
  tripName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareTripModal({
  tripId,
  tripName,
  isOpen,
  onClose,
}: ShareTripModalProps) {
  const [shares, setShares] = useState<TripShare[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadShares = useCallback(async () => {
    try {
      const response = await tripShareApi.getByTripId(tripId);
      setShares(response.data);
    } catch (err) {
      console.error('Error loading shares:', err);
    }
  }, [tripId]);

  useEffect(() => {
    if (isOpen) {
      loadShares();
      setEmail('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, loadShares]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await tripShareApi.create(tripId, { email });
      setSuccess(`Trip shared with ${email}`);
      setEmail('');
      loadShares();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to share trip');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (share: TripShare) => {
    if (!confirm(`Remove access for ${share.user_email}?`)) {
      return;
    }

    try {
      await tripShareApi.delete(tripId, share.id);
      loadShares();
      setSuccess(`Removed access for ${share.user_email}`);
    } catch (err) {
      setError('Failed to remove share');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Share Trip</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Share &quot;{tripName}&quot; with others by entering their email address.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded mb-4 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleShare} className="flex gap-2 mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              <UserPlus className="w-4 h-4" />
              Share
            </button>
          </form>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Shared with ({shares.length})
            </h3>
            {shares.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                This trip is not shared with anyone yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                  >
                    <div>
                      <span className="text-sm text-gray-900">
                        {share.user_email}
                      </span>
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {share.permission}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
