'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { CalendarIcon, CheckIcon, MapPinIcon, PlusIcon, XIcon, ClockIcon } from '@/components/ui/icons';
import { formatDate, formatDateTime } from '@/lib/format';
import type { AppEvent } from '@/lib/types';

export default function EvenementsPage() {
  const { data: me } = useMe();
  const canCreate = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR']);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: events, isLoading } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events') });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => api.post(`/events/${id}/participation`, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Ta réponse a été enregistrée.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Réponse impossible.'),
  });

  const sorted = [...(events ?? [])].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div>
      <PageHeader
        eyebrow="Vie de communauté"
        title="Événements"
        description="Chaque rencontre compte. Confirme ta présence et vis ces moments avec nous."
        actions={
          canCreate && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Créer un événement
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !sorted.length ? (
        <EmptyState icon={<CalendarIcon />} title="Aucun événement programmé" description="Les prochaines rencontres apparaîtront ici." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {sorted.map((event) => {
            const mine = event.participations?.find((p) => p.memberId === me?.id);
            const past = new Date(event.startsAt) < new Date();
            return (
              <div key={event.id} className="card animate-fade-up overflow-hidden">
                <div className="bg-mims-gradient px-5 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mims-100">{formatDate(event.startsAt, { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold">{event.title}</h3>
                </div>
                <div className="p-5">
                  {event.description && <p className="text-sm text-ink-700">{event.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1.5"><ClockIcon width={14} height={14} />{formatDateTime(event.startsAt)}</span>
                    {event.location && <span className="flex items-center gap-1.5"><MapPinIcon width={14} height={14} />{event.location}</span>}
                  </div>

                  {!past && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => respond.mutate({ id: event.id, response: 'PRESENT' })}
                        className={`btn-secondary !flex-1 ${mine?.response === 'PRESENT' ? '!bg-emerald-600 !text-white !ring-0' : ''}`}
                      >
                        <CheckIcon width={16} height={16} /> Je serai là
                      </button>
                      <button
                        onClick={() => respond.mutate({ id: event.id, response: 'ABSENT' })}
                        className={`btn-secondary !flex-1 ${mine?.response === 'ABSENT' ? '!bg-rose-600 !text-white !ring-0' : ''}`}
                      >
                        <XIcon width={16} height={16} /> Je ne pourrai pas
                      </button>
                    </div>
                  )}

                  {event._count && (
                    <p className="mt-3 text-xs text-ink-500">{event._count.participations} réponse(s) enregistrée(s)</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', location: '', startsAt: '' });

  const create = useMutation({
    mutationFn: () => api.post('/events', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Événement créé et communauté notifiée.');
      handleClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Création impossible.'),
  });

  function handleClose() {
    setForm({ title: '', description: '', location: '', startsAt: '' });
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Créer un événement" description="Tous les membres actifs seront notifiés automatiquement.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <label className="label">Titre</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Lieu</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Date &amp; heure</label>
            <input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Publier l'événement
          </button>
        </div>
      </form>
    </Modal>
  );
}
