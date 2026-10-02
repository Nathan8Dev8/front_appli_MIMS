'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BellIcon, CheckIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSupportState,
  isPushSubscribed,
  needsHomeScreenInstall,
  sendTestPush,
} from '@/lib/push';
import { playNotificationChime } from '@/lib/sound';

type State = 'loading' | 'on' | 'off' | 'denied' | 'install' | 'unsupported';

const ENABLE_ERRORS: Record<string, string> = {
  denied: 'Tu as refusé les notifications. Réactive-les dans les réglages de ton navigateur.',
  unsupported: 'Ce navigateur ne gère pas les notifications.',
  'not-configured': 'Les notifications ne sont pas encore configurées sur ce site.',
};

/** Réglage des notifications de CET appareil (chaque téléphone / ordinateur s'active séparément). */
export function PushSettings({ compact = false, onEnabled }: { compact?: boolean; onEnabled?: () => void }) {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (needsHomeScreenInstall()) return setState('install');
      const support = getPushSupportState();
      if (support === 'unsupported') return setState('unsupported');
      if (support === 'denied') return setState('denied');
      setState((await isPushSubscribed()) ? 'on' : 'off');
    })();
  }, []);

  async function enable() {
    setBusy(true);
    const res = await enablePushNotifications();
    setBusy(false);
    if (res.success) {
      setState('on');
      toast.success('Notifications activées sur cet appareil ✅');
      onEnabled?.();
    } else {
      if (res.reason === 'denied') setState('denied');
      toast.error(ENABLE_ERRORS[res.reason ?? ''] ?? "Impossible d'activer les notifications pour l'instant.");
    }
  }

  async function disable() {
    setBusy(true);
    await disablePushNotifications().catch(() => undefined);
    setBusy(false);
    setState('off');
    toast.success('Notifications coupées sur cet appareil.');
  }

  async function test() {
    setBusy(true);
    try {
      await sendTestPush();
      toast.success('Envoyée ! Tu peux même verrouiller ton téléphone pour voir.');
    } catch {
      toast.error("La notification d'essai n'est pas partie.");
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <Spinner className="h-5 w-5 text-mims-700" />;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${state === 'on' ? 'bg-emerald-50 text-emerald-600' : 'bg-mims-50 text-mims-700'}`}>
          {state === 'on' ? <CheckIcon width={18} height={18} /> : <BellIcon width={18} height={18} />}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {state === 'on' && <p className="font-semibold text-ink-900">Activées sur cet appareil</p>}
          {state === 'off' && <p className="font-semibold text-ink-900">Pas encore activées sur cet appareil</p>}
          {state === 'denied' && <p className="font-semibold text-ink-900">Bloquées par le navigateur</p>}
          {state === 'unsupported' && <p className="font-semibold text-ink-900">Non disponibles sur ce navigateur</p>}
          {state === 'install' && <p className="font-semibold text-ink-900">Installe d'abord l'appli</p>}
          {!compact && (
            <p className="mt-0.5 text-ink-500">
              {state === 'on' && "Tu es prévenu même quand l'appli est fermée, comme pour un message."}
              {state === 'off' && "Active-les pour être prévenu même quand l'appli est fermée."}
              {state === 'denied' && 'Ouvre les réglages du site dans ton navigateur (le cadenas à côté de l’adresse) et autorise les notifications.'}
              {state === 'unsupported' && 'Essaie avec Chrome, Edge, Firefox ou Safari à jour.'}
              {state === 'install' && 'Sur iPhone : touche Partager ⬆️ puis « Sur l’écran d’accueil », ouvre l’appli depuis là, et reviens ici.'}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {state === 'off' && (
          <button className="btn-primary" onClick={enable} disabled={busy}>
            {busy && <Spinner />} Activer les notifications
          </button>
        )}
        {state === 'on' && (
          <>
            <button className="btn-secondary" onClick={test} disabled={busy}>
              {busy && <Spinner />} M'envoyer un essai
            </button>
            {!compact && (
              <button className="btn-ghost" onClick={disable} disabled={busy}>
                Désactiver
              </button>
            )}
          </>
        )}
        {!compact && (
          <button className="btn-ghost" onClick={() => playNotificationChime()}>
            🔊 Écouter le son
          </button>
        )}
      </div>
    </div>
  );
}
