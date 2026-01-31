'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Shield } from 'lucide-react';

export default function Navigation() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="flex items-center space-x-2">
        <span className="text-2xl">🌍</span>
        <span className="text-xl font-bold">Travel Planner</span>
      </Link>

      <div className="flex items-center space-x-4">
        {isLoading ? (
          <span className="text-blue-200">Loading...</span>
        ) : isAuthenticated ? (
          <>
            <Link
              href="/trips"
              className="text-white hover:text-blue-200 transition-colors"
            >
              My Trips
            </Link>
            {user?.role === 'admin' && (
              <>
                <span className="text-blue-200">|</span>
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-white hover:text-blue-200 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              </>
            )}
            <span className="text-blue-200">|</span>
            <span className="text-blue-100 text-sm">
              {user?.full_name || user?.email}
            </span>
            <button
              onClick={logout}
              className="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-sm transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-white hover:text-blue-200 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm transition-colors"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
