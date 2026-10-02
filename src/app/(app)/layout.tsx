'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { DesktopSidebar, MobileSidebar, MobileTabBar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { FullPageSpinner } from '@/components/ui/spinner';
import { PushOptInBanner } from '@/components/notifications/push-opt-in-banner';
import { EmojiAssist } from '@/components/ui/emoji-assist';
import { QuizPrompt } from '@/components/quiz/quiz-prompt';
import { FeedbackModal } from '@/components/feedback/feedback';

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
        <Topbar />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-8 sm:pt-8 lg:pb-10">
          <PushOptInBanner />
          {children}
        </main>
      </div>
      <MobileTabBar onOpenMenu={() => setMenuOpen(true)} />
      <EmojiAssist />
      <QuizPrompt />
      <FeedbackModal />
    </div>
  );
}
