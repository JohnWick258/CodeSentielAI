'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { Navbar } from '@/components/navbar';
import { DemoTour } from '@/components/demo-tour';
import { NotificationBell } from '@/components/notification-bell';
import { seedDemoData } from '@/lib/supabase/data';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = sessionStorage.getItem('codesentinel.tour');
      if (stored === 'true') {
        setShowTour(true);
        sessionStorage.removeItem('codesentinel.tour');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !seeding) {
      setSeeding(true);
      seedDemoData().catch(() => {}).finally(() => setSeeding(false));
    }
  }, [user, seeding]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40">
        <Navbar />
      </div>
      <main className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 ${showTour ? 'pb-56' : ''}`}>
        {children}
      </main>
      {mounted && showTour && <DemoTour onClose={() => setShowTour(false)} />}
      {mounted && <NotificationBell />}
    </div>
  );
}
