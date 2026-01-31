// app/trips/page.tsx
// Redirects to home page where the trips list is displayed
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TripsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-xl text-gray-600">Redirecting...</div>
    </div>
  );
}
