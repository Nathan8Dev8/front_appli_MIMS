'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { useOnboarding } from '@/hooks/use-onboarding';
import { BirthDateForm } from '@/components/profile/birth-date-form';
import { STAFF_ROLES } from '@/lib/nav';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatFcfa, timeAgo } from '@/lib/format';
import type { AppEvent, AppDocument, MonthlyDue, Announcement, MemberSummary, CashSummary } from '@/lib/types';
import { ORGANIZER_ROLES, isCancelled, isPast, missingReport } from '@/lib/events';
import { WalletIcon, CalendarIcon, FileTextIcon, UsersIcon, ChartIcon, ArrowRightIcon, MapPinIcon, MegaphoneIcon } from '@/components/ui/icons';

export default function DashboardPage() {
  const { data: me } = useMe();
  const isStaff = hasRole(me, STAFF_ROLES);
  const isTreasurer = hasRole(me, ['TRESORIER', 'PRESIDENT_ADMIN']);
  const isOrganizer = hasRole(me, ORGANIZER_ROLES);

  const { data: onboarding } = useOnboarding();
  const { data: myDues } = useQuery({ queryKey: ['dues', 'me'], queryFn: () => api.get<MonthlyDue[]>('/dues/me') });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events') });
  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: () => api.get<AppDocument[]>('/documents') });
  const { data: announcements } = useQuery({ queryKey: ['announcements'], queryFn: () => api.get<Announcement[]>('/announcements') });

  const { data: members } = useQuery({
    queryKey: ['members', 'all'],
    queryFn: () => api.get<MemberSummary[]>('/members'),
    enabled: isStaff,
  });
  const { data: cash } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: () => api.get<CashSummary>('/finance/summary'),
    enabled: isTreasurer,
  });

  const currentDue = myDues?.find((d) => d.status !== 'PAYE');
  const upcomingEvents = (events ?? []).filter((e) => !isPast(e) && !isCancelled(e)).slice(0, 3);
  const toComplete = (events ?? []).filter((e) => missingReport(e).length).length;
  const activeMembers = members?.filter((m) => m.status === 'ACTIF').length;
  const latestDocument = [...(documents ?? [])].sort(
    (a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime(),
  )[0];
  const latestAnnouncement = announcements?.[0];

  return (
    <div>
      <PageHeader
        eyebrow={formatDate(new Date(), { weekday: 'long', day: '2-digit', month: 'long' })}
        title={`${greeting()} ${me?.firstName ?? ''}`}
        description="Ce qui se passe dans le groupe aujourd'hui."
      />

      {onboarding && onboarding.status !== 'TERMINE' && (
        <Link
          href="/bienvenue"
          className="mb-6 flex animate-fade-up items-center gap-4 rounded-2xl bg-gold-100 p-4 ring-1 ring-gold-300 transition hover:shadow-hover sm:p-5"
        >
          <span className="text-2xl">👋</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">Termine ton inscription</p>
            <p className="text-sm text-ink-700">Active les notifications et accepte le règlement du groupe.</p>
          </div>
          <ArrowRightIcon width={18} height={18} className="shrink-0 text-ink-700" />
        </Link>
      )}

      {onboarding?.status === 'TERMINE' && me && !me.birthDate && (
        <div className="mb-6 animate-fade-up rounded-2xl bg-gold-100 p-4 ring-1 ring-gold-300 sm:p-5">
          <p className="font-semibold text-ink-900">🎂 Ajoute ta date de naissance</p>
          <p className="mb-3 text-sm text-ink-700">Le groupe te souhaitera ton anniversaire ce jour-là.</p>
          <BirthDateForm />
        </div>
      )}

      {latestAnnouncement && (
        <Link
          href="/annonces"
          className="mb-6 flex animate-fade-up items-start gap-4 rounded-2xl bg-mims-gradient p-5 text-white shadow-card transition hover:shadow-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <MegaphoneIcon width={20} height={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-mims-100">Dernière annonce · {timeAgo(latestAnnouncement.publishedAt)}</p>
            <p className="mt-1 truncate font-display text-base font-semibold">{latestAnnouncement.title}</p>
            <p className="mt-0.5 line-clamp-1 text-sm text-mims-100/90">{latestAnnouncement.content}</p>
          </div>
          <ArrowRightIcon width={18} height={18} className="mt-1 shrink-0 text-mims-100" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/cotisations" className="block">
          <StatCard
            label="Ma cotisation"
            value={currentDue ? formatFcfa(currentDue.balance) : 'À jour'}
            hint={currentDue ? `À régler le ${formatDate(currentDue.dueDate, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}` : 'Tu es à jour, merci 🙌'}
            icon={WalletIcon}
            tone={currentDue ? 'warning' : 'success'}
          />
        </Link>
        <Link href="/documents" className="block">
          <StatCard
            label="Dernier document"
            value={latestDocument ? latestDocument.title : 'Pas encore de document'}
            hint={latestDocument ? `Publié le ${formatDate(latestDocument.publishedAt ?? latestDocument.createdAt)}` : 'Le règlement et les PV seront ici dès leur publication'}
            icon={FileTextIcon}
          />
        </Link>
      </div>

      <div className="card mt-6 animate-fade-up p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">📅 Événements à venir</h2>
          <Link href="/evenements" className="flex items-center gap-1 text-sm font-semibold text-mims-700 hover:text-mims-800">
            Tout voir <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <EmptyState icon={<CalendarIcon />} title="Rien de prévu pour l'instant" description="Les prochains rendez-vous du groupe apparaîtront ici." />
        ) : (
          <ul className="space-y-3">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <Link href={`/evenements/${event.id}`} className="flex items-center gap-3 rounded-xl bg-mims-50/60 p-3 transition hover:bg-mims-50 sm:gap-4 sm:p-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-mims-700 shadow-soft ring-1 ring-black/[0.04]">
                  <span className="font-display text-xl font-semibold leading-none">{formatDate(event.startsAt, { day: '2-digit' })}</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{formatDate(event.startsAt, { month: 'short' }).replace('.', '')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{event.kind === 'ASSISE' && '🏛️ '}{event.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span className="flex items-center gap-1"><CalendarIcon width={14} height={14} />{formatDate(event.startsAt, { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                    {event.location && <span className="flex items-center gap-1"><MapPinIcon width={14} height={14} />{event.location}</span>}
                  </p>
                </div>
                <ArrowRightIcon width={18} height={18} className="shrink-0 text-mims-700" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isStaff && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">🧭 Vue d'ensemble du bureau</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/membres" className="block">
              <StatCard label="Membres actifs" value={activeMembers === undefined ? '—' : String(activeMembers)} icon={UsersIcon} />
            </Link>
            {isOrganizer && (
              <Link href="/evenements" className="block">
                <StatCard
                  label="Comptes rendus à faire"
                  value={String(toComplete)}
                  hint={toComplete ? 'Présences, décisions ou PV manquants' : 'Tout est à jour'}
                  icon={FileTextIcon}
                  tone={toComplete ? 'warning' : 'success'}
                />
              </Link>
            )}
            {isTreasurer && (
              <>
                <Link href="/cotisations" className="block">
                  <StatCard
                    label="Solde en caisse"
                    value={cash ? formatFcfa(cash.balance) : '—'}
                    hint={cash ? `+${formatFcfa(cash.monthEntries)} ce mois · −${formatFcfa(cash.monthExits)}` : undefined}
                    icon={WalletIcon}
                  />
                </Link>
                <Link href="/cotisations" className="block">
                  <StatCard
                    label="Membres en retard"
                    value={String(cash?.arrears.debtors ?? '—')}
                    hint={cash?.arrears.debtors ? `${formatFcfa(cash.arrears.total)} au total` : 'Aucun retard'}
                    icon={ChartIcon}
                    tone={cash?.arrears.debtors ? 'warning' : 'success'}
                  />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
