'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { FullPageSpinner, Spinner } from '@/components/ui/spinner';
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  DownloadIcon,
  EditIcon,
  FileTextIcon,
  MapPinIcon,
  SearchIcon,
  UploadIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { EventFormModal } from '@/components/events/event-form-modal';
import { RsvpButtons } from '@/components/events/rsvp-buttons';
import { DOCUMENT_MANAGER_ROLES, EVENT_KIND_LABELS, ORGANIZER_ROLES, eventStats, isCancelled, isPast } from '@/lib/events';
import { STAFF_ROLES } from '@/lib/nav';
import { formatDate } from '@/lib/format';
import type { AppEvent, MemberSummary } from '@/lib/types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: me } = useMe();
  const isOrganizer = hasRole(me, ORGANIZER_ROLES);
  const isStaff = hasRole(me, STAFF_ROLES);
  const canUploadPv = hasRole(me, DOCUMENT_MANAGER_ROLES);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const { data: event, isLoading, error } = useQuery({ queryKey: ['events', id], queryFn: () => api.get<AppEvent>(`/events/${id}`) });

  if (isLoading) return <FullPageSpinner />;
  if (!event) {
    return <EmptyState icon={<CalendarIcon />} title="Événement introuvable" description={error instanceof ApiError ? error.message : undefined} />;
  }

  const past = isPast(event);
  const cancelled = isCancelled(event);
  const stats = eventStats(event, me?.id);
  const attendees = event.participations.filter((p) => p.attended).map((p) => p.member!).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.back()} className="btn-ghost -ml-3 mb-4 !px-3">
        <ChevronLeftIcon width={18} height={18} /> Retour
      </button>

      {/* En-tête */}
      <div className="card overflow-hidden">
        <div className="bg-mims-gradient px-5 py-6 text-white sm:px-7">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant={event.kind === 'ASSISE' ? 'gold' : 'info'}>{EVENT_KIND_LABELS[event.kind]}</Badge>
            {cancelled && <Badge variant="danger">Annulé</Badge>}
            {past && !cancelled && <Badge variant="neutral" className="!bg-white/15 !text-white">Passé</Badge>}
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{event.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-mims-100">
            <span className="flex items-center gap-1.5">
              <ClockIcon width={16} height={16} />
              {formatDate(event.startsAt, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {event.location && <span className="flex items-center gap-1.5"><MapPinIcon width={16} height={16} />{event.location}</span>}
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {event.description && <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{event.description}</p>}

          {!past && !cancelled && (
            <div>
              <RsvpButtons eventId={event.id} mine={stats.mine} />
              <p className="mt-2 text-xs text-ink-500">
                {stats.coming} seront là · {stats.notComing} pas dispo
              </p>
            </div>
          )}

          {isOrganizer && !cancelled && (
            <div className="flex flex-wrap gap-2 border-t border-ink-300/30 pt-4">
              <button className="btn-secondary !py-2" onClick={() => setEditOpen(true)}>
                <EditIcon width={16} height={16} /> Modifier
              </button>
              {!past && (
                <button className="btn-ghost !py-2 !text-rose-600 hover:!bg-rose-50" onClick={() => setCancelOpen(true)}>
                  Annuler l'événement
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {event.agenda && (
        <Section title="📋 Ordre du jour">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{event.agenda}</p>
        </Section>
      )}

      {/* Compte rendu : disponible une fois l'événement commencé */}
      {past && !cancelled && (
        <>
          <Section
            title="✋ Présences"
            action={
              isOrganizer && (
                <button className="btn-secondary !px-4 !py-2 text-xs" onClick={() => setAttendanceOpen(true)}>
                  <CheckIcon width={14} height={14} /> {stats.attendanceTaken ? 'Modifier' : 'Faire l’appel'}
                </button>
              )
            }
          >
            {stats.attendanceTaken ? (
              <>
                <p className="text-sm text-ink-700">
                  <span className="font-display text-2xl font-semibold text-ink-900">{stats.attended}</span> présent{stats.attended > 1 ? 's' : ''}
                </p>
                {isStaff && attendees.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attendees.map((m) => (
                      <span key={m.id} className="flex items-center gap-2 rounded-full bg-mist-200 py-1 pl-1 pr-3 text-xs font-medium text-ink-700">
                        <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size="sm" />
                        {m.firstName} {m.lastName}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-500">L'appel n'a pas encore été fait.</p>
            )}
          </Section>

          <DecisionsSection event={event} canEdit={isOrganizer} />

          <Section
            title={event.kind === 'ASSISE' ? "📄 Rapport d'assise" : '📄 Procès-verbal'}
            action={canUploadPv && <PvUploadButton eventId={event.id} replace={!!event.reportDocument} />}
          >
            {event.reportDocument ? (
              <button
                onClick={() =>
                  downloadFile(`/documents/${event.reportDocument!.id}/download`).catch((e) =>
                    toast.error(e instanceof ApiError ? e.message : "Le téléchargement n'a pas marché."),
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl bg-mims-50/70 p-3 text-left transition hover:bg-mims-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-mims-700 shadow-soft">
                  <FileTextIcon width={18} height={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{event.reportDocument.title}</span>
                <DownloadIcon width={18} height={18} className="shrink-0 text-mims-700" />
              </button>
            ) : (
              <p className="text-sm text-ink-500">
                {event.kind === 'ASSISE' ? 'Pas encore de rapport.' : 'Pas encore de PV.'}
                {canUploadPv && ' Ajoute-le : il sera aussi rangé dans Documents.'}
              </p>
            )}
          </Section>
        </>
      )}

      {isOrganizer && (
        <>
          <EventFormModal open={editOpen} onClose={() => setEditOpen(false)} event={event} />
          <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} event={event} />
          {past && <AttendanceModal open={attendanceOpen} onClose={() => setAttendanceOpen(false)} event={event} />}
        </>
      )}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card mt-4 animate-fade-up p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };
}

function DecisionsSection({ event, canEdit }: { event: AppEvent; canEdit: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalidate = useInvalidateEvents();

  const save = useMutation({
    mutationFn: () => api.patch(`/events/${event.id}`, { decisions: draft ?? '' }),
    onSuccess: () => {
      invalidate();
      toast.success('Compte rendu enregistré ✅');
      setDraft(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas pu être enregistré."),
  });

  return (
    <Section
      title={event.kind === 'ASSISE' ? '📝 Décisions & résolutions' : '📝 Compte rendu'}
      action={
        canEdit && draft === null && (
          <button className="btn-secondary !px-4 !py-2 text-xs" onClick={() => setDraft(event.decisions ?? '')}>
            <EditIcon width={14} height={14} /> {event.decisions ? 'Modifier' : 'Rédiger'}
          </button>
        )
      }
    >
      {draft !== null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <textarea
            autoFocus
            className="input min-h-40"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'- Décision 1\n- Décision 2\n- Prochaine assise le …'}
          />
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending && <Spinner />} Enregistrer
            </button>
          </div>
        </form>
      ) : event.decisions ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{event.decisions}</p>
      ) : (
        <p className="text-sm text-ink-500">Rien n'a encore été noté.</p>
      )}
    </Section>
  );
}

function PvUploadButton({ eventId, replace }: { eventId: string; replace: boolean }) {
  const invalidate = useInvalidateEvents();
  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/events/${eventId}/report`, formData);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Publié, tout le monde est prévenu ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le PV n'a pas pu être envoyé."),
  });

  return (
    <label className={`btn-secondary cursor-pointer !px-4 !py-2 text-xs ${upload.isPending ? 'pointer-events-none opacity-60' : ''}`}>
      {upload.isPending ? <Spinner /> : <UploadIcon width={14} height={14} />}
      {replace ? 'Remplacer' : 'Ajouter le fichier'}
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function CancelModal({ open, onClose, event }: { open: boolean; onClose: () => void; event: AppEvent }) {
  const invalidate = useInvalidateEvents();
  const cancel = useMutation({
    mutationFn: () => api.post(`/events/${event.id}/cancel`),
    onSuccess: () => {
      invalidate();
      toast.success('Événement annulé, les membres sont prévenus.');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'annulation n'a pas marché."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Annuler cet événement ?" description="Tous les membres actifs recevront une notification. L'événement reste visible dans l'historique.">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="btn-ghost" onClick={onClose}>Garder</button>
        <button className="btn-primary !bg-rose-600 hover:!bg-rose-700" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {cancel.isPending && <Spinner />} Oui, annuler
        </button>
      </div>
    </Modal>
  );
}

/** Appel : on part des présences déjà pointées, sinon de ceux qui avaient dit « je serai là ». */
function AttendanceModal({ open, onClose, event }: { open: boolean; onClose: () => void; event: AppEvent }) {
  const invalidate = useInvalidateEvents();
  const [search, setSearch] = useState('');
  const [present, setPresent] = useState<Set<string> | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'all'],
    queryFn: () => api.get<MemberSummary[]>('/members'),
    enabled: open,
  });

  const taken = event.participations.some((p) => p.attended !== null);
  const initial = useMemo(
    () => new Set(event.participations.filter((p) => (taken ? p.attended : p.response === 'PRESENT')).map((p) => p.memberId)),
    [event.participations, taken],
  );
  const selected = present ?? initial;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => m.status === 'ACTIF' || selected.has(m.id))
      .filter((m) => !q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
  }, [members, search, selected]);

  const save = useMutation({
    mutationFn: () => api.put(`/events/${event.id}/attendance`, { presentMemberIds: [...selected] }),
    onSuccess: () => {
      invalidate();
      toast.success('Présences enregistrées ✅');
      close();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Les présences n'ont pas pu être enregistrées."),
  });

  function close() {
    setPresent(null);
    setSearch('');
    onClose();
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPresent(next);
  }

  return (
    <Modal open={open} onClose={close} title="Faire l'appel" description="Touche un nom pour le marquer présent.">
      <div className="relative mb-3">
        <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
        <input data-no-emoji className="input pl-11" placeholder="Chercher un membre…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-700">{selected.size} présent{selected.size > 1 ? 's' : ''}</span>
        <div className="flex gap-3">
          <button className="font-semibold text-mims-700" onClick={() => setPresent(new Set([...selected, ...list.map((m) => m.id)]))}>Tout cocher</button>
          <button className="font-semibold text-ink-500" onClick={() => setPresent(new Set())}>Tout décocher</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-mims-700" /></div>
      ) : !list.length ? (
        <EmptyState icon={<UsersIcon />} title="Aucun membre trouvé" />
      ) : (
        <ul className="max-h-[45dvh] space-y-1.5 overflow-y-auto">
          {list.map((m) => {
            const on = selected.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${on ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-mist-200'}`}
                >
                  <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{m.firstName} {m.lastName}</span>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'bg-emerald-600 text-white' : 'ring-1 ring-ink-300'}`}>
                    {on && <CheckIcon width={14} height={14} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="btn-ghost" onClick={close}>Annuler</button>
        <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Spinner />} Enregistrer l'appel
        </button>
      </div>
    </Modal>
  );
}
