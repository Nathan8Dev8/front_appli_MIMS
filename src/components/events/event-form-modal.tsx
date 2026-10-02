'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { EVENT_KIND_LABELS, toLocalInput } from '@/lib/events';
import type { AppEvent, EventKind } from '@/lib/types';

const EMPTY = { kind: 'ACTIVITE' as EventKind, title: '', description: '', location: '', startsAt: '', agenda: '' };

/** Un seul formulaire pour créer et modifier un événement (ou une assise). */
export function EventFormModal({
  open,
  onClose,
  event,
  defaultKind,
}: {
  open: boolean;
  onClose: () => void;
  event?: AppEvent;
  defaultKind?: EventKind;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(
      event
        ? {
            kind: event.kind,
            title: event.title,
            description: event.description ?? '',
            location: event.location ?? '',
            startsAt: toLocalInput(event.startsAt),
            agenda: event.agenda ?? '',
          }
        : { ...EMPTY, kind: defaultKind ?? 'ACTIVITE' },
    );
  }, [open, event, defaultKind]);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, startsAt: new Date(form.startsAt).toISOString() };
      return event ? api.patch(`/events/${event.id}`, body) : api.post('/events', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(event ? 'Modifications enregistrées ✅' : 'Publié, tout le monde est prévenu ✅');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas pu être enregistré."),
  });

  const isAssise = form.kind === 'ASSISE';
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Modifier' : isAssise ? 'Programmer une assise' : 'Créer un événement'}
      description={event ? undefined : 'Les membres actifs reçoivent une notification.'}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <span className="label">Type</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(EVENT_KIND_LABELS) as EventKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm({ ...form, kind: k })}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 ring-inset transition ${
                  form.kind === k ? 'bg-mims-700 text-white ring-mims-700' : 'bg-white text-ink-700 ring-ink-300/60 hover:ring-mims-300'
                }`}
              >
                {EVENT_KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ev-title">Titre</label>
          <input
            id="ev-title"
            className="input"
            value={form.title}
            onChange={set('title')}
            placeholder={isAssise ? 'Ex. Assise mensuelle d’octobre' : 'Ex. Sortie détente'}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ev-date">Date &amp; heure</label>
            <input id="ev-date" type="datetime-local" className="input" value={form.startsAt} onChange={set('startsAt')} required />
          </div>
          <div>
            <label className="label" htmlFor="ev-location">Lieu</label>
            <input id="ev-location" className="input" value={form.location} onChange={set('location')} />
          </div>
        </div>
        {isAssise ? (
          <div>
            <label className="label" htmlFor="ev-agenda">Ordre du jour</label>
            <textarea id="ev-agenda" className="input min-h-28" value={form.agenda} onChange={set('agenda')} placeholder={'1. Mot d’accueil\n2. Point de la caisse\n3. Divers'} />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="ev-desc">Description</label>
            <textarea id="ev-desc" className="input min-h-20" value={form.description} onChange={set('description')} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {event ? 'Enregistrer' : 'Publier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
