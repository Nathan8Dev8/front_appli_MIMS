'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { enablePushNotifications, getPushSupportState, isPushSubscribed } from '@/lib/push';
import { BellIcon, XIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';

const DISMISS_KEY = 'jeunes-mims-push-banner-dismissed';

export function PushOptInBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = getPushSupportState();
      if (state !== 'default') return; // déjà accordé, refusé, ou non supporté par ce navigateur
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {
        // stockage indisponible (navigation privée…) : on affiche quand même la bannière
      }
      const alreadySubscribed = await isPushSubscribed();
      if (!cancelled && !alreadySubscribed) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setLoading(true);
    const res = await enablePushNotifications();
    setLoading(false);
    if (res.success) {
      toast.success('Notifications activées sur cet appareil !');
      setVisible(false);
      return;
    }

    switch (res.reason) {
      case 'denied':
        toast.error('Notifications refusées. Tu peux les réactiver dans les réglages de ton navigateur.');
        setVisible(false);
        break;
      case 'unsupported':
        toast.error("Ton navigateur ne prend pas en charge les notifications push.");
        setVisible(false);
        break;
      case 'not-configured':
        // Erreur de configuration côté app, pas côté utilisateur — inutile de la lui présenter comme si c'était sa faute.
        toast.error("Les notifications ne sont pas configurées sur ce déploiement (clé VAPID manquante).");
        break;
      default:
        toast.error("Impossible d'activer les notifications pour le moment. Réessaie dans un instant.");
    }
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // tant pis, la bannière pourra réapparaître à la prochaine visite
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl bg-mims-gradient px-5 py-4 text-white shadow-card animate-fade-up sm:flex-row sm:items-center">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
        <BellIcon width={20} height={20} />
      </div>
      <div className="flex-1">
        <p className="font-semibold">Ne manque plus rien de la vie du groupe</p>
        <p className="text-sm text-mims-100/90">
          Active les notifications pour être alerté même quand l'application est fermée.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={handleEnable} disabled={loading} className="btn-secondary !bg-white !text-mims-800">
          {loading && <Spinner />}
          Activer
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Ignorer"
        >
          <XIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
