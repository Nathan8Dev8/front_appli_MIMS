'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { DesktopSidebar, MobileSidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { FullPageSpinner } from '@/components/ui/spinner';
import { PushOptInBanner } from '@/components/notifications/push-opt-in-banner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/connexion');
    } else if (mustChangePassword) {
      router.replace('/connexion/nouveau-mot-de-passe');
    }
  }, [hydrated, token, mustChangePassword, router]);

  if (!hydrated || !token || mustChangePassword) {
    return <FullPageSpinner />;
  }

  return (
    <div className="min-h-screen bg-mist-200">
      <DesktopSidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <PushOptInBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
