'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AlertIcon, ArrowRightIcon, CalendarIcon, ClockIcon, MapPinIcon, PlusIcon } from '@/components/ui/icons';
import { EventFormModal } from '@/components/events/event-form-modal';
import { RsvpButtons } from '@/components/events/rsvp-buttons';
import { EVENT_KIND_LABELS, ORGANIZER_ROLES, eventStats, isCancelled, isPast, missingReport } from '@/lib/events';
import { formatDate } from '@/lib/format';
import type { AppEvent } from '@/lib/types';

export default function EvenementsPage() {
  const { data: me } = useMe();
  const isOrganizer = hasRole(me, ORGANIZER_ROLES);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: events, isLoading } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events') });

  const upcoming = (events ?? []).filter((e) => !isPast(e));
  const toComplete = isOrganizer ? (events ?? []).filter((e) => missingReport(e).length).reverse() : [];

  return (
    <div>
      <PageHeader
        eyebrow="Vie du groupe"
        title="Événements"
        description="Les prochains rendez-vous et assises. Dis-nous si tu seras là, ça aide à préparer."
        actions={
          isOrganizer && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Nouvel événement
            </button>
          )
        }
      />

      {toComplete.length > 0 && (
        <section className="mb-8 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertIcon width={18} height={18} /> Comptes rendus à compléter ({toComplete.length})
          </h2>
          <ul className="space-y-2">
            {toComplete.slice(0, 5).map((e) => (
              <li key={e.id}>
                <Link href={`/evenements/${e.id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-soft transition hover:shadow-hover">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{e.title}</p>
                    <p className="text-xs text-ink-500">{formatDate(e.startsAt)} · manque : {missingReport(e).join(', ')}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-mims-700">Compléter</span>
                  <ArrowRightIcon width={16} height={16} className="shrink-0 text-mims-700" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !upcoming.length ? (
        <EmptyState icon={<CalendarIcon />} title="Rien de prévu pour l'instant" description="Les prochains rendez-vous du groupe s'afficheront ici." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} meId={me?.id} />
          ))}
        </div>
      )}

      <Link
        href="/historique?type=evenements"
        className="mt-8 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm font-semibold text-mims-700 shadow-soft ring-1 ring-ink-300/40 transition hover:bg-mims-50"
      >
        Événements passés, assises et comptes rendus
        <ArrowRightIcon width={16} height={16} />
      </Link>

      <EventFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function EventCard({ event, meId }: { event: AppEvent; meId?: string }) {
  const { mine, coming } = eventStats(event, meId);
  const cancelled = isCancelled(event);

  return (
    <div className={`card animate-fade-up flex flex-col p-5 ${cancelled ? 'opacity-70' : ''}`}>
      <Link href={`/evenements/${event.id}`} className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-mims-gradient text-white">
          <span className="font-display text-2xl font-semibold leading-none">{formatDate(event.startsAt, { day: '2-digit' })}</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-mims-100">
            {formatDate(event.startsAt, { month: 'short' }).replace('.', '')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={event.kind === 'ASSISE' ? 'gold' : 'info'}>{EVENT_KIND_LABELS[event.kind]}</Badge>
            {cancelled && <Badge variant="danger">Annulé</Badge>}
          </div>
          <h3 className="font-display text-base font-semibold leading-snug text-ink-900">{event.title}</h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="flex items-center gap-1">
              <ClockIcon width={14} height={14} />
              {formatDate(event.startsAt, { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
            {event.location && <span className="flex items-center gap-1"><MapPinIcon width={14} height={14} />{event.location}</span>}
          </p>
        </div>
      </Link>

      {!cancelled && (
        <div className="mt-4">
          <RsvpButtons eventId={event.id} mine={mine} />
          <p className="mt-2 text-xs text-ink-500">{coming ? `${coming} personne${coming > 1 ? 's' : ''} seront là` : 'Sois le premier à répondre'}</p>
        </div>
      )}
    </div>
  );
}
