'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { STAFF_ROLES } from '@/lib/nav';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatFcfa, formatMonth, timeAgo } from '@/lib/format';
import type { AppEvent, AppDocument, MonthlyDue, Announcement } from '@/lib/types';
import { WalletIcon, CalendarIcon, PollIcon, BrainIcon, UsersIcon, ChartIcon, ArrowRightIcon, MapPinIcon, MegaphoneIcon } from '@/components/ui/icons';

interface DebtRow {
  member: { id: string; firstName: string; lastName: string };
  monthsLate: number;
  totalDebt: number;
}

export default function DashboardPage() {
  const { data: me } = useMe();
  const isStaff = hasRole(me, STAFF_ROLES);
  const isTreasurer = hasRole(me, ['TRESORIER', 'PRESIDENT_ADMIN']);

  const { data: myDues } = useQuery({ queryKey: ['dues', 'me'], queryFn: () => api.get<MonthlyDue[]>('/dues/me') });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events') });
  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: () => api.get<AppDocument[]>('/documents') });
  const { data: announcements } = useQuery({ queryKey: ['announcements'], queryFn: () => api.get<Announcement[]>('/announcements') });

  const { data: members } = useQuery({
    queryKey: ['members', 'all'],
    queryFn: () => api.get<unknown[]>('/members'),
    enabled: isStaff,
  });
  const { data: debtSummary } = useQuery({
    queryKey: ['dues', 'debt-summary'],
    queryFn: () => api.get<DebtRow[]>('/dues/debt-summary'),
    enabled: isTreasurer,
  });

  const currentDue = myDues?.find((d) => d.status !== 'PAYE');
  const upcomingEvents = (events ?? []).filter((e) => new Date(e.startsAt) >= new Date()).slice(0, 3);
  const recentDocuments = (documents ?? []).slice(0, 3);
  const latestAnnouncement = announcements?.[0];

  return (
    <div>
      <PageHeader
        eyebrow={formatDate(new Date(), { weekday: 'long', day: '2-digit', month: 'long' })}
        title={`${greeting()}, ${me?.firstName ?? ''} !`}
        description="Voici l'essentiel de ta vie de communauté aujourd'hui."
      />

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/cotisations">
          <StatCard
            label="Ma cotisation"
            value={currentDue ? formatFcfa(currentDue.balance) : 'À jour'}
            hint={currentDue ? `Échéance ${formatDate(currentDue.dueDate)}` : 'Merci pour ta régularité !'}
            icon={WalletIcon}
            tone={currentDue ? 'warning' : 'success'}
          />
        </Link>
        <Link href="/evenements">
          <StatCard
            label="Prochain événement"
            value={upcomingEvents[0] ? upcomingEvents[0].title : 'Aucun pour le moment'}
            hint={upcomingEvents[0] ? formatDate(upcomingEvents[0].startsAt) : 'Reviens bientôt'}
            icon={CalendarIcon}
          />
        </Link>
        <Link href="/sondages">
          <StatCard label="Sondages" value="Donne ton avis" hint="Ta voix compte pour le groupe" icon={PollIcon} />
        </Link>
        <Link href="/quiz">
          <StatCard label="Quiz" value="Teste-toi" hint="Apprends en t'amusant" icon={BrainIcon} />
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card animate-fade-up p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Événements à venir</h2>
            <Link href="/evenements" className="flex items-center gap-1 text-sm font-semibold text-mims-700 hover:text-mims-800">
              Tout voir <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={<CalendarIcon />} title="Rien de prévu pour l'instant" description="Les prochains rendez-vous du groupe apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-ink-300/30">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-ink-900">{event.title}</p>
                    <p className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1"><CalendarIcon width={14} height={14} />{formatDate(event.startsAt)}</span>
                      {event.location && <span className="flex items-center gap-1"><MapPinIcon width={14} height={14} />{event.location}</span>}
                    </p>
                  </div>
                  <Link href="/evenements" className="btn-secondary !px-4 !py-2 text-xs">Répondre</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card animate-fade-up p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Derniers documents</h2>
            <Link href="/documents" className="text-sm font-semibold text-mims-700 hover:text-mims-800">Tout voir</Link>
          </div>
          {recentDocuments.length === 0 ? (
            <EmptyState title="Aucun document publié" description="Le règlement et les PV apparaîtront ici." />
          ) : (
            <ul className="space-y-3">
              {recentDocuments.map((doc) => (
                <li key={doc.id}>
                  <Link href="/documents" className="flex items-center justify-between rounded-xl px-2 py-2 -mx-2 hover:bg-mims-50">
                    <span className="text-sm font-medium text-ink-900">{doc.title}</span>
                    <span className="text-xs text-ink-500">{formatDate(doc.publishedAt ?? doc.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isStaff && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Vue d'ensemble du bureau</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Membres actifs" value={String(members?.length ?? '—')} icon={UsersIcon} />
            {isTreasurer && (
              <>
                <StatCard
                  label="Cotisations du mois"
                  value={formatMonth(new Date())}
                  hint="Suivi détaillé dans Cotisations"
                  icon={WalletIcon}
                />
                <StatCard
                  label="Membres en arriéré"
                  value={String(debtSummary?.length ?? 0)}
                  hint={debtSummary?.length ? `${formatFcfa(debtSummary.reduce((s, d) => s + d.totalDebt, 0))} au total` : 'Aucun retard'}
                  icon={ChartIcon}
                  tone={debtSummary?.length ? 'warning' : 'success'}
                />
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
  if (hour < 18) return 'Bel après-midi';
  return 'Bonsoir';
}
