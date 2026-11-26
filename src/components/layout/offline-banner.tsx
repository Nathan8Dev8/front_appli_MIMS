'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { flushOutbox } from '@/lib/api-client';
import { outbox, type FailedAction, type QueuedAction } from '@/lib/offline-queue';
import { timeAgo } from '@/lib/format';
import { useAuthStore } from '@/store/auth-store';

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/**
 * Bandeau hors ligne + envoi de la file : dit à la personne qu'elle n'a pas de
 * réseau, depuis quand datent les données affichées, ce qui attend d'être
 * envoyé, et ce que le serveur a refusé au retour de la connexion.
 */
export function OfflineBanner() {
  const queryClient = useQueryClient();
  const memberId = useAuthStore((s) => s.member?.id);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [pending, setPending] = useState<QueuedAction[]>([]);
  const [failed, setFailed] = useState<FailedAction[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setPending(outbox.list().filter((a) => a.memberId === memberId));
      setFailed(outbox.failed());
    };
    refresh();
    window.addEventListener('outbox-change', refresh);
    window.addEventListener('storage', refresh); // autre onglet
    return () => {
      window.removeEventListener('outbox-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [memberId]);

  // Envoi au retour du réseau, à l'ouverture, puis toutes les 20 s tant qu'il reste quelque chose.
  useEffect(() => {
    if (!online) return;
    const run = async () => {
      const before = outbox.failed().length;
      const sent = await flushOutbox();
      if (sent > 0) {
        toast.success(sent === 1 ? 'Ton action hors ligne a été envoyée ✅' : `${sent} actions hors ligne envoyées ✅`);
        queryClient.invalidateQueries();
      }
      if (outbox.failed().length > before) queryClient.invalidateQueries();
    };
    run();
    const id = setInterval(() => {
      if (outbox.list().length) run();
      tick((n) => n + 1); // rafraîchit « il y a X min »
    }, 20_000);
    return () => clearInterval(id);
  }, [online, queryClient]);

  const lastData = Math.max(0, ...queryClient.getQueryCache().getAll().map((q) => q.state.dataUpdatedAt));

  if (online && !pending.length && !failed.length) return null;

  return (
    <div className="mb-5 space-y-3">
      {(!online || pending.length > 0) && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {!online ? (
            <p className="font-semibold">
              📴 Pas de connexion.{lastData > 0 && <> Données mises à jour {timeAgo(new Date(lastData))}.</>}
              <span className="block font-normal">Encaissements, sorties, présences et votes restent possibles : ils seront envoyés dès que le réseau revient.</span>
            </p>
          ) : (
            <p className="font-semibold">🕓 Envoi en cours…</p>
          )}
          {pending.length > 0 && (
            <ul className="mt-2 space-y-1">
              {pending.map((a) => (
                <li key={a.key}>🕓 {a.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {failed.length > 0 && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
          <p className="font-semibold">Ces actions faites hors ligne n&apos;ont pas pu être enregistrées :</p>
          <ul className="mt-2 space-y-1">
            {failed.map((f, i) => (
              <li key={i}>
                ❌ {f.label} — <span className="italic">{f.message}</span>
              </li>
            ))}
          </ul>
          <button className="btn-secondary mt-3 !px-4 !py-1.5 text-sm" onClick={() => outbox.clearFailed()}>
            J&apos;ai compris
          </button>
        </div>
      )}
    </div>
  );
}
