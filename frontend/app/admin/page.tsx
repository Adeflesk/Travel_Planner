'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, AdminStats, AdminUserCreate } from '@/lib/types';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Users, Activity, UserPlus, Trash2, Shield, ShieldOff } from 'lucide-react';

function AdminDashboardContent() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState<AdminUserCreate>({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    is_active: true,
  });
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Failed to load admin data. You may not have admin access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await adminApi.createUser(newUser);
      setShowCreateForm(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
        is_active: true,
      });
      loadData();
    } catch (err) {
      setError('Failed to create user');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      setError('Cannot deactivate your own account');
      return;
    }

    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      loadData();
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleToggleRole = async (user: User) => {
    if (user.id === currentUser?.id) {
      setError('Cannot change your own role');
      return;
    }

    try {
      await adminApi.updateUser(user.id, {
        role: user.role === 'admin' ? 'user' : 'admin',
      });
      loadData();
    } catch (err) {
      setError('Failed to update user role');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      setError('Cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${user.email}?`)) {
      return;
    }

    try {
      await adminApi.deleteUser(user.id);
      loadData();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Trips
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right text-red-500 hover:text-red-700"
          >
            x
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total_users}</p>
                <p className="text-gray-500">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.active_users}</p>
                <p className="text-gray-500">Active Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.inactive_users}</p>
                <p className="text-gray-500">Inactive Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total_trips}</p>
                <p className="text-gray-500">Total Trips</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">User Management</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            {showCreateForm ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Create User
            </button>
          </form>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={!user.is_active ? 'bg-gray-100' : ''}>
                  <td className="px-4 py-3 text-sm text-gray-900">{user.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {user.email}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-blue-600">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {user.full_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleRole(user)}
                        disabled={user.id === currentUser?.id}
                        title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {user.role === 'admin' ? (
                          <ShieldOff className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={user.id === currentUser?.id}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-1 ${
                          user.is_active
                            ? 'text-yellow-600 hover:text-yellow-800'
                            : 'text-green-600 hover:text-green-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={user.id === currentUser?.id}
                        title="Delete user"
                        className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
