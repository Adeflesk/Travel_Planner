'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Shield, Plane } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Navigation() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <nav className="flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center space-x-2 group">
        <Plane className="w-6 h-6 text-white group-hover:text-primary-200 transition-colors" />
        <span className="text-xl font-bold text-white">Travel Planner</span>
      </Link>

      <div className="flex items-center space-x-4">
        {isLoading ? (
          <span className="text-primary-200">Loading...</span>
        ) : isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className="text-white hover:text-primary-200 transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/trips"
              className="text-white hover:text-primary-200 transition-colors font-medium"
            >
              My Trips
            </Link>
            {user?.role === 'admin' && (
              <>
                <span className="text-primary-300">|</span>
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-white hover:text-primary-200 transition-colors font-medium"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              </>
            )}
            <span className="text-primary-300">|</span>
            <span className="text-primary-100 text-sm">
              {user?.full_name || user?.email}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              className="text-white hover:bg-primary-500"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-white hover:text-primary-200 transition-colors font-medium"
            >
              Login
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.location.href = '/register'}
              className="bg-white text-primary-600 hover:bg-primary-50"
            >
              Sign Up
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
