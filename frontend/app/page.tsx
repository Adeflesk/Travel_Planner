// app/page.tsx
// Redirects to the dashboard as the default landing page.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-xl text-slate-600">Redirecting to dashboard...</div>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeRedirect />
    </ProtectedRoute>
  );
}
