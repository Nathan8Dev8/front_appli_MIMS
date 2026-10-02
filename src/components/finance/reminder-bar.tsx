'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { BellIcon } from '@/components/ui/icons';
import type { ReminderPreview, ReminderResult } from '@/lib/types';

/** Bandeau « Rappel » placé en haut de la page : prévient d'un clic tous les membres en retard. */
export function ReminderBar({ debtors }: { debtors: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <BellIcon width={20} height={20} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-ink-900">Rappel de cotisation</p>
            <p className="text-sm text-ink-700">
              {debtors > 0
                ? `${debtors} membre${debtors > 1 ? 's ont' : ' a'} du retard. Le rappel s'affiche dans leurs notifications.`
                : 'Personne n’est en retard pour le moment 👌'}
            </p>
          </div>
        </div>
        <button className="btn-primary shrink-0 !bg-amber-600 hover:!bg-amber-700" onClick={() => setOpen(true)} disabled={debtors === 0}>
          <BellIcon width={16} height={16} /> Envoyer un rappel
        </button>
      </div>
      <ReminderModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ReminderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['finance', 'reminder-preview'],
    queryFn: () => api.get<ReminderPreview>('/finance/reminders/preview'),
    enabled: open,
    staleTime: 0,
  });

  const send = useMutation({
    mutationFn: () => api.post<ReminderResult>('/finance/reminders/send'),
    onSuccess: (r) => {
      if (r.sent === 0 && r.failed === 0) toast('Tout le monde a déjà été relancé aujourd’hui.', { icon: '👍' });
      else if (r.failed === 0) toast.success(`Rappel envoyé à ${r.sent} membre${r.sent > 1 ? 's' : ''} ✅`);
      else toast.error(`Rappel envoyé à ${r.sent} membre${r.sent > 1 ? 's' : ''}, ${r.failed} n'${r.failed > 1 ? 'ont' : 'a'} pas pu être prévenu${r.failed > 1 ? 's' : ''}. Tu peux réessayer.`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le rappel n'est pas parti."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Envoyer le rappel" description="Chaque membre en retard reçoit une notification avec son montant." maxWidth="max-w-xl">
      {isLoading ? (
        <div className="flex justify-center py-8 text-mims-700"><Spinner className="h-6 w-6" /></div>
      ) : error || !preview ? (
        <p className="text-sm text-rose-600">{error instanceof ApiError ? error.message : 'Impossible de préparer le rappel.'}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Count label="Membres prévenus" value={preview.toSend} />
            <Count label="Avec alerte téléphone" value={preview.withPush} />
            <Count label="Déjà relancés (24 h)" value={preview.skipped} muted />
          </div>

          <p className="text-xs text-ink-500">
            Le message apparaît dans l'appli de chaque membre. Ceux qui ont activé les notifications reçoivent aussi une alerte sur
            leur téléphone. Les autres le verront à leur prochaine visite.
          </p>

          {preview.sample && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Exemple de message (pour {preview.sample.firstName})</p>
              <p className="rounded-xl bg-mims-50 px-4 py-3 text-sm text-ink-900">{preview.sample.message}</p>
            </div>
          )}

          {preview.toSend === 0 && (
            <p className="text-sm text-ink-500">
              {preview.debtors === 0 ? 'Personne n’a de dette.' : 'Tous les membres en retard ont déjà reçu un rappel dans les dernières 24 h.'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button className="btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn-primary" disabled={preview.toSend === 0 || send.isPending} onClick={() => send.mutate()}>
              {send.isPending && <Spinner />}
              Envoyer à {preview.toSend} membre{preview.toSend > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Count({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-3 ${muted ? 'bg-mist-100' : 'bg-mims-50'}`}>
      <p className={`font-display text-2xl font-semibold ${muted ? 'text-ink-500' : 'text-mims-700'}`}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  );
}
