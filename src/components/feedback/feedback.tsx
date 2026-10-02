'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { UploadIcon } from '@/components/ui/icons';
import type { FeedbackStatus } from '@/lib/types';

const OPEN_EVENT = 'jeunes-mims:open-feedback';

/** Ouvre le formulaire depuis n'importe où (ex. bouton du menu). */
export const openFeedback = () => window.dispatchEvent(new Event(OPEN_EVENT));

export const FEEDBACK_STATUS: Record<FeedbackStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'neutral' }> = {
  NOUVEAU: { label: '📨 Reçu', variant: 'warning' },
  PRIS_EN_COMPTE: { label: '🛠️ Pris en compte', variant: 'info' },
  TERMINE: { label: '✅ Terminé', variant: 'success' },
  NON_RETENU: { label: '📁 Pas retenu', variant: 'neutral' },
};

/** Appareil et navigateur, relevés pour aider à reproduire un bug. */
function deviceInfo() {
  const installed = window.matchMedia('(display-mode: standalone)').matches ? 'appli installée' : 'navigateur';
  return `${navigator.userAgent} · écran ${window.innerWidth}×${window.innerHeight} · ${installed}`;
}

function shortDevice() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'navigateur';
  return `${os} · ${browser}`;
}

/** Formulaire « Signaler un bug ou une idée », monté une fois dans la mise en page de l'appli. */
export function FeedbackModal() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState('');
  const [kind, setKind] = useState<'BUG' | 'AMELIORATION'>('BUG');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setPage(window.location.pathname);
      setKind('BUG');
      setTitle('');
      setDescription('');
      setFile(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Changer de page ferme le formulaire.
  useEffect(() => setOpen(false), [pathname]);

  const send = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('title', title);
      form.append('description', description);
      form.append('page', page);
      form.append('device', deviceInfo());
      if (file) form.append('screenshot', file);
      return api.post('/feedback', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Merci ! Ton retour aide à améliorer l’appli 🙏');
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'envoi n'a pas marché."),
  });

  const bug = kind === 'BUG';
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Améliorer l'appli" description="Un bug ou une idée ? Ça part directement à l'administrateur de l'appli.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(['BUG', 'AMELIORATION'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition ${
                kind === k ? 'bg-mims-700 text-white ring-mims-700' : 'bg-white text-ink-700 ring-ink-300/60 hover:ring-mims-300'
              }`}
            >
              {k === 'BUG' ? '🐞 Un bug' : '✨ Une amélioration'}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="fb-title">{bug ? 'Le problème en une phrase' : 'Ton idée en une phrase'}</label>
          <input
            id="fb-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={bug ? 'Ex. Le bouton « Envoyer » ne réagit pas' : 'Ex. Pouvoir filtrer les événements par lieu'}
            maxLength={150}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="fb-desc">{bug ? 'Ce que tu faisais et ce qui s’est passé' : 'Explique ton idée'}</label>
          <textarea
            id="fb-desc"
            className="input min-h-32"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={bug ? '1. J’ai ouvert…\n2. J’ai touché…\n3. Il s’est passé… alors que j’attendais…' : 'À quoi ça servirait, pour qui…'}
            required
          />
        </div>
        <div>
          <span className="label">Capture d'écran (optionnel)</span>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300/60 px-3 py-4 text-center text-sm font-medium text-ink-500 hover:border-mims-400 hover:text-mims-700">
            <UploadIcon width={18} height={18} className="shrink-0" />
            <span className="truncate">{file ? file.name : 'Ajouter une image'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <p className="rounded-xl bg-mist-200 px-3 py-2 text-xs text-ink-500">
          Envoyé avec : page <b>{page || '/'}</b> · {typeof navigator !== 'undefined' ? shortDevice() : ''}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={send.isPending || !title.trim() || !description.trim()}>
            {send.isPending && <Spinner />} Envoyer
          </button>
        </div>
      </form>
    </Modal>
  );
}
