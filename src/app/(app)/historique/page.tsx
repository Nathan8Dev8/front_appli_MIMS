'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { ChevronRightIcon, ClockIcon, DownloadIcon, FileTextIcon, SearchIcon, WalletIcon } from '@/components/ui/icons';
import { EVENT_KIND_LABELS, eventStats, isCancelled } from '@/lib/events';
import { formatDate, formatFcfa } from '@/lib/format';
import type { AppDocument, AppEvent, FinanceReport } from '@/lib/types';

type Filter = 'tout' | 'assises' | 'evenements' | 'documents' | 'caisse';

const DOC_TYPE_LABELS: Record<string, string> = { REGLEMENT: 'Règlement', PV: 'Procès-verbal', AUTRE: 'Document' };
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

type Entry =
  | { kind: 'event'; date: Date; event: AppEvent }
  | { kind: 'document'; date: Date; document: AppDocument }
  | { kind: 'caisse'; date: Date; month: FinanceReport['byMonth'][number]; year: number };

export default function HistoriquePage() {
  return (
    <Suspense fallback={null}>
      <HistoriqueContent />
    </Suspense>
  );
}

function HistoriqueContent() {
  const params = useSearchParams();
  const { data: me } = useMe();
  const canSeeCaisse = hasRole(me, ['TRESORIER', 'PRESIDENT_ADMIN']);

  const initial = params.get('type') as Filter | null;
  const [filter, setFilter] = useState<Filter>(initial && ['assises', 'evenements', 'documents', 'caisse'].includes(initial) ? initial : 'tout');
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [month, setMonth] = useState<string>('');

  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events') });
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', 'history'],
    queryFn: () => api.get<AppDocument[]>('/documents?archived=1'),
  });
  const { data: report } = useQuery({
    queryKey: ['reports', 'monthly-finance', year],
    queryFn: () => api.get<FinanceReport>(`/reports/monthly-finance?year=${year}`),
    enabled: canSeeCaisse && year !== 'all',
  });

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    events?.forEach((e) => set.add(new Date(e.startsAt).getFullYear()));
    documents?.forEach((d) => set.add(new Date(d.documentDate ?? d.publishedAt ?? d.createdAt).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [events, documents]);

  const groups = useMemo(() => {
    const now = new Date();
    const entries: Entry[] = [];

    if (filter !== 'documents' && filter !== 'caisse') {
      for (const event of events ?? []) {
        const date = new Date(event.startsAt);
        if (date > now) continue;
        if (filter === 'assises' && event.kind !== 'ASSISE') continue;
        entries.push({ kind: 'event', date, event });
      }
    }
    if (filter === 'tout' || filter === 'documents') {
      for (const document of documents ?? []) {
        if (document.status === 'BROUILLON') continue;
        // Le PV d'une assise s'affiche déjà sur la ligne de l'assise.
        if (filter === 'tout' && document.reportFor) continue;
        entries.push({ kind: 'document', date: new Date(document.documentDate ?? document.publishedAt ?? document.createdAt), document });
      }
    }
    if (canSeeCaisse && report && (filter === 'tout' || filter === 'caisse')) {
      for (const m of report.byMonth) {
        const date = new Date(report.year, m.month - 1, 1);
        if (date > now || (!m.total && !m.exits)) continue;
        entries.push({ kind: 'caisse', date, month: m, year: report.year });
      }
    }

    const q = search.trim().toLowerCase();
    const visible = entries
      .filter((e) => year === 'all' || e.date.getFullYear() === Number(year))
      .filter((e) => !month || e.date.getMonth() === Number(month))
      .filter((e) => !q || entryText(e).toLowerCase().includes(q))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const byMonth = new Map<string, Entry[]>();
    for (const e of visible) {
      const key = `${MONTHS[e.date.getMonth()]} ${e.date.getFullYear()}`;
      byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
    }
    return [...byMonth.entries()];
  }, [events, documents, report, filter, search, year, month, canSeeCaisse]);

  const tabs: { value: Filter; label: string }[] = [
    { value: 'tout', label: 'Tout' },
    { value: 'assises', label: 'Assises' },
    { value: 'evenements', label: 'Événements' },
    { value: 'documents', label: 'Documents' },
    ...(canSeeCaisse ? [{ value: 'caisse' as const, label: 'Caisse' }] : []),
  ];

  const hasFilters = !!(search || month || year !== String(new Date().getFullYear()));

  return (
    <div>
      <PageHeader
        eyebrow="La mémoire du groupe"
        title="Historique"
        description="Les assises et leurs comptes rendus, les événements passés, les documents et la caisse, classés par date."
      />

      <Tabs value={filter} onChange={setFilter} items={tabs} className="mb-4" />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
        <div className="relative col-span-2 sm:flex-1">
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input pl-11" placeholder="Rechercher un titre, un lieu, une décision…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Année">
          <option value="all">Toutes les années</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input sm:w-40" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mois">
          <option value="">Tous les mois</option>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        {hasFilters && (
          <button
            className="btn-ghost col-span-2 !py-2 text-xs"
            onClick={() => {
              setSearch('');
              setMonth('');
              setYear(String(new Date().getFullYear()));
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {filter === 'caisse' && report && year !== 'all' && (
        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Entrées', value: report.totalCollected, tone: 'text-emerald-600' },
            { label: 'Sorties', value: report.totalExits, tone: 'text-rose-600' },
            { label: 'Reste à encaisser', value: report.totalOutstanding, tone: report.totalOutstanding ? 'text-amber-600' : 'text-ink-900' },
          ].map((s) => (
            <div key={s.label} className="card p-3 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{s.label} {report.year}</p>
              <p className={`mt-1 font-display text-sm font-semibold sm:text-xl ${s.tone}`}>{formatFcfa(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {filter === 'caisse' && year === 'all' && (
        <p className="mb-4 rounded-xl bg-mims-50 p-3 text-sm text-mims-800">Choisis une année pour voir le bilan de la caisse mois par mois.</p>
      )}

      {loadingEvents || loadingDocs ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !groups.length ? (
        <EmptyState icon={<ClockIcon />} title="Rien sur cette période" description="Change d'année, de mois ou de recherche." />
      ) : (
        <div className="space-y-8">
          {groups.map(([label, items]) => (
            <section key={label}>
              <h2 className="sticky top-16 z-10 -mx-4 mb-3 bg-mist-200/90 px-4 py-2 text-xs font-bold uppercase tracking-widest text-mims-600 backdrop-blur sm:mx-0 sm:rounded-full sm:px-3">
                {label}
              </h2>
              <ul className="space-y-2.5">
                {items.map((entry) => (
                  <li key={entryKey(entry)}>
                    <EntryRow entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function entryKey(e: Entry) {
  if (e.kind === 'event') return `e-${e.event.id}`;
  if (e.kind === 'document') return `d-${e.document.id}`;
  return `c-${e.year}-${e.month.month}`;
}

function entryText(e: Entry) {
  if (e.kind === 'event') return [e.event.title, e.event.location, e.event.description, e.event.agenda, e.event.decisions].join(' ');
  if (e.kind === 'document') return [e.document.title, e.document.description, DOC_TYPE_LABELS[e.document.type]].join(' ');
  return 'caisse cotisations finances';
}

const ROW = 'card flex w-full items-center gap-3 p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-hover sm:gap-4 sm:p-4';

function DateChip({ date }: { date: Date }) {
  return (
    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-mist-200 text-ink-700">
      <span className="font-display text-lg font-semibold leading-none">{formatDate(date, { day: '2-digit' })}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase">{formatDate(date, { month: 'short' }).replace('.', '')}</span>
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  if (entry.kind === 'event') {
    const { event } = entry;
    const stats = eventStats(event);
    return (
      <Link href={`/evenements/${event.id}`} className={ROW}>
        <DateChip date={entry.date} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-900">{event.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={event.kind === 'ASSISE' ? 'gold' : 'info'}>{EVENT_KIND_LABELS[event.kind]}</Badge>
            {isCancelled(event) ? (
              <Badge variant="danger">Annulé</Badge>
            ) : (
              <>
                {stats.attendanceTaken && <Badge variant="neutral">{stats.attended} présent{stats.attended > 1 ? 's' : ''}</Badge>}
                {event.decisions && <Badge variant="success">Compte rendu</Badge>}
                {event.reportDocument && <Badge variant="success">PV</Badge>}
              </>
            )}
          </div>
        </div>
        <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-500" />
      </Link>
    );
  }

  if (entry.kind === 'document') {
    const { document } = entry;
    return (
      <button
        className={ROW}
        onClick={() => downloadFile(`/documents/${document.id}/download`).catch((e) => toast.error(e instanceof ApiError ? e.message : "Le téléchargement n'a pas marché."))}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mims-50 text-mims-700">
          <FileTextIcon width={20} height={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-900">{document.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{DOC_TYPE_LABELS[document.type]}</Badge>
            {document.status === 'ARCHIVE' && <Badge variant="neutral">Archivé</Badge>}
            <span className="text-xs text-ink-500">{formatDate(entry.date)}</span>
          </div>
        </div>
        <DownloadIcon width={18} height={18} className="shrink-0 text-mims-700" />
      </button>
    );
  }

  const { month, year } = entry;
  const from = `${year}-${String(month.month).padStart(2, '0')}-01`;
  const to = new Date(Date.UTC(year, month.month, 0)).toISOString().slice(0, 10);
  return (
    <Link href={`/transactions?from=${from}&to=${to}`} className={ROW}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <WalletIcon width={20} height={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">Caisse de {MONTHS[month.month - 1].toLowerCase()}</p>
        <p className="mt-1 text-xs text-ink-500">
          <span className="font-semibold text-emerald-600">+{formatFcfa(month.total)}</span>
          {' · '}
          <span className="font-semibold text-rose-600">−{formatFcfa(month.exits)}</span>
          {' · '}
          {month.count} versement{month.count > 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-500" />
    </Link>
  );
}
