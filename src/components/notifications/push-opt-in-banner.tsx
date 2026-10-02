'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { XIcon } from '@/components/ui/icons';
import { getPushSupportState, isPushSubscribed, needsHomeScreenInstall } from '@/lib/push';
import { PushSettings } from './push-settings';

const DISMISS_KEY = 'jeunes-mims-push-banner-dismissed';

/** Invite à activer les notifications (ou, sur iPhone, à installer l'appli d'abord). */
export function PushOptInBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {
        // stockage indisponible (navigation privée…) : on affiche quand même
      }
      const show = needsHomeScreenInstall() || (getPushSupportState() === 'default' && !(await isPushSubscribed()));
      if (!cancelled && show) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // tant pis, le bandeau pourra réapparaître à la prochaine visite
    }
    setVisible(false);
  }

  // Ces pages ont déjà leur propre réglage des notifications.
  if (!visible || pathname === '/mon-profil' || pathname === '/bienvenue') return null;

  return (
    <div className="relative mb-6 animate-fade-up rounded-2xl bg-white p-4 pr-12 shadow-card ring-1 ring-mims-100 sm:p-5 sm:pr-14">
      <p className="mb-3 font-display font-semibold text-ink-900">Ne rate plus rien du groupe 🔔</p>
      <PushSettings compact onEnabled={() => setVisible(false)} />
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-mist-200"
        aria-label="Plus tard"
      >
        <XIcon width={16} height={16} />
      </button>
    </div>
  );
}
