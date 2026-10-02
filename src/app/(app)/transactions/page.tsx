'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { ArrowDownLeftIcon, ArrowUpRightIcon, DownloadIcon, ReceiptIcon, SearchIcon, WalletIcon } from '@/components/ui/icons';
import { ReasonDialog } from '@/components/finance/reason-dialog';
import { TransactionTable } from '@/components/finance/transaction-table';
import { LiveStatus } from '@/components/finance/live-status';
import { useDebounced } from '@/hooks/use-debounced';
import { ENTRY_NATURES, EXIT_NATURES, LIVE_REFRESH_MS, NATURE_LABELS, todayInputValue } from '@/lib/finance';
import { formatFcfa } from '@/lib/format';
import type { TransactionRow, TransactionsPage } from '@/lib/types';

const PAGE_SIZE = 25;

type Direction = '' | 'ENTREE' | 'SORTIE';

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRESETS: { label: string; range: () => [string, string] }[] = [
  {
    label: 'Ce mois',
    range: () => {
      const n = new Date();
      return [isoDay(new Date(n.getFullYear(), n.getMonth(), 1)), isoDay(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
    },
  },
  {
    label: 'Mois dernier',
    range: () => {
      const n = new Date();
      return [isoDay(new Date(n.getFullYear(), n.getMonth() - 1, 1)), isoDay(new Date(n.getFullYear(), n.getMonth(), 0))];
    },
  },
  {
    label: 'Cette année',
    range: () => {
      const y = new Date().getFullYear();
      return [`${y}-01-01`, `${y}-12-31`];
    },
  },
  { label: 'Tout', range: () => ['', ''] },
];

export default function TransactionsPage() {
  return (
    <RequireRole roles={['TRESORIER', 'PRESIDENT_ADMIN']}>
      <Suspense fallback={null}>
        <TransactionsContent />
      </Suspense>
    </RequireRole>
  );
}

function TransactionsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<Direction>('');
  const [nature, setNature] = useState('');
  const [status, setStatus] = useState('');
  // Une période peut arriver de l'Historique (?from=…&to=…).
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [target, setTarget] = useState<TransactionRow | null>(null);
  const q = useDebounced(search.trim());

  // Toute modification d'un filtre ramène à la première page.
  const setFilter = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q) p.set('q', q);
    if (direction) p.set('direction', direction);
    if (nature) p.set('nature', nature);
    if (status) p.set('status', status);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
  }, [q, direction, nature, status, from, to, page]);

  const { data, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ['finance', 'transactions', params],
    queryFn: () => api.get<TransactionsPage>(`/finance/transactions?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFRESH_MS,
    refetchOnWindowFocus: true,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hasFilters = !!(q || direction || nature || status || from || to);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['finance'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['dues'] });
  };

  const cancel = useMutation({
    mutationFn: (reason: string) =>
      target!.kind === 'EXPENSE'
        ? api.post(`/finance/expenses/${target!.id}/cancel`, { reason })
        : api.post(`/payments/${target!.id}/reverse`, { reason }),
    onSuccess: () => {
      toast.success(target?.kind === 'EXPENSE' ? 'Sortie annulée ✅' : 'Paiement annulé ✅');
      setTarget(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas pu être fait."),
  });

  const confirm = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/confirm`),
    onSuccess: () => {
      toast.success('Paiement validé ✅');
      refresh();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le paiement n'a pas pu être validé."),
  });

  function reset() {
    setSearch('');
    setDirection('');
    setNature('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const directionTabs: { value: Direction; label: string }[] = [
    { value: '', label: 'Tout' },
    { value: 'ENTREE', label: 'Entrées' },
    { value: 'SORTIE', label: 'Sorties' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Finances"
        title="Transactions"
        description="Toutes les entrées et sorties de la caisse."
        actions={
          <button className="btn-primary" onClick={() => setExportOpen(true)}>
            <DownloadIcon width={16} height={16} /> Rapport Excel
          </button>
        }
      />

      <div className="card mb-6 space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              data-no-emoji
              className="input !pl-10"
              placeholder="Rechercher un membre, un motif, une référence, une collecte…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="inline-flex self-start rounded-full bg-mist-200 p-1">
            {directionTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setDirection(t.value);
                  setNature('');
                  setPage(1);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${direction === t.value ? 'bg-white text-mims-700 shadow-soft' : 'text-ink-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Nature</label>
            <select className="input" value={nature} onChange={(e) => setFilter(setNature)(e.target.value)}>
              <option value="">Toutes les natures</option>
              {direction !== 'SORTIE' && (
                <optgroup label="Entrées">
                  {ENTRY_NATURES.map((n) => <option key={n} value={n}>{NATURE_LABELS[n]}</option>)}
                </optgroup>
              )}
              {direction !== 'ENTREE' && (
                <optgroup label="Sorties">
                  {EXIT_NATURES.map((n) => <option key={n} value={n}>{NATURE_LABELS[n]}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="label">Statut</label>
            <select className="input" value={status} onChange={(e) => setFilter(setStatus)(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="VALIDE">Validées</option>
              <option value="ANNULE">Annulées</option>
              <option value="EN_ATTENTE">En attente</option>
            </select>
          </div>
          <div>
            <label className="label">Du</label>
            <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFilter(setFrom)(e.target.value)} />
          </div>
          <div>
            <label className="label">Au</label>
            <input type="date" className="input" value={to} min={from || undefined} max={todayInputValue()} onChange={(e) => setFilter(setTo)(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Période :</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="rounded-full bg-mist-200 px-3 py-1 text-xs font-semibold text-ink-700 transition hover:bg-mims-100 hover:text-mims-700"
              onClick={() => {
                const [f, t] = p.range();
                setFrom(f);
                setTo(t);
                setPage(1);
              }}
            >
              {p.label}
            </button>
          ))}
          {hasFilters && (
            <button className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={reset}>Réinitialiser les filtres</button>
          )}
        </div>
      </div>

      <LiveStatus className="mb-3 justify-end" updatedAt={dataUpdatedAt} fetching={isFetching} onRefresh={refresh} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Total icon={ArrowDownLeftIcon} label="Entrées" value={data?.totals.entries} tone="emerald" />
        <Total icon={ArrowUpRightIcon} label="Sorties" value={data?.totals.exits} tone="rose" />
        <Total icon={WalletIcon} label="Solde de la sélection" value={data?.totals.net} tone="mims" signed />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16 text-mims-700"><Spinner className="h-7 w-7" /></div>
        ) : error ? (
          <div className="p-6"><EmptyState title="Impossible de charger la liste" description={error instanceof ApiError ? error.message : 'Réessaie dans un instant.'} /></div>
        ) : !data?.items.length ? (
          <div className="p-6">
            <EmptyState
              icon={<ReceiptIcon />}
              title={hasFilters ? 'Aucune transaction ne correspond' : 'Aucune transaction enregistrée'}
              description={hasFilters ? 'Élargis la période ou retire un filtre.' : "Les entrées et sorties s'afficheront ici dès qu'elles seront notées."}
              action={hasFilters ? <button className="btn-secondary" onClick={reset}>Réinitialiser les filtres</button> : undefined}
            />
          </div>
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
            <TransactionTable
              items={data.items}
              renderActions={(t) => (
                <div className="flex items-center justify-end gap-3">
                  {t.receiptId && t.status === 'VALIDE' && (
                    <button
                      className="text-xs font-semibold text-mims-700 hover:text-mims-800"
                      onClick={() => downloadFile(`/receipts/${t.receiptId}/download`, `recu-${t.reference}.pdf`).catch((e) => toast.error(e instanceof ApiError ? e.message : "Le téléchargement n'a pas marché."))}
                    >
                      Reçu
                    </button>
                  )}
                  {t.status === 'EN_ATTENTE' && (
                    <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700" onClick={() => confirm.mutate(t.id)} disabled={confirm.isPending}>
                      Valider
                    </button>
                  )}
                  {t.status === 'VALIDE' && (
                    <button className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => setTarget(t)}>
                      Annuler
                    </button>
                  )}
                </div>
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-300/30 px-5 py-3 text-sm">
              <span className="text-ink-500">{data.total} opération{data.total > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-3">
                <button className="btn-secondary !px-4 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</button>
                <span className="text-ink-500">Page {data.page} / {totalPages}</span>
                <button className="btn-secondary !px-4 !py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ReasonDialog
        open={!!target}
        onClose={() => setTarget(null)}
        pending={cancel.isPending}
        onConfirm={(reason) => cancel.mutate(reason)}
        title={target?.kind === 'EXPENSE' ? 'Annuler cette sortie ?' : 'Annuler ce paiement ?'}
        description={
          target?.kind === 'EXPENSE'
            ? "La sortie reste dans l'historique, marquée comme annulée, et l'argent revient dans la caisse."
            : "Le paiement reste dans l'historique, marqué comme annulé, et l'argent sort de la caisse."
        }
        confirmLabel={target?.kind === 'EXPENSE' ? 'Annuler la sortie' : 'Annuler le paiement'}
      />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

function Total({
  icon: Icon,
  label,
  value,
  tone,
  signed,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value?: number;
  tone: 'emerald' | 'rose' | 'mims';
  signed?: boolean;
}) {
  const tones = {
    emerald: { box: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' },
    rose: { box: 'bg-rose-50 text-rose-600', text: 'text-rose-600' },
    mims: { box: 'bg-mims-50 text-mims-700', text: 'text-mims-700' },
  }[tone];
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones.box}`}>
        <Icon width={20} height={20} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <p className={`font-display text-xl font-semibold ${tones.text}`}>
          {value === undefined ? '—' : `${signed && value > 0 ? '+' : ''}${formatFcfa(value)}`}
        </p>
      </div>
    </div>
  );
}

function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = new Date();
  const [mode, setMode] = useState<'mois' | 'annee'>('mois');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const download = useMutation({
    mutationFn: () => {
      if (mode === 'annee') return downloadFile(`/finance/report/export?year=${year}`, `rapport-financier-${year}.xlsx`);
      const [y, m] = month.split('-');
      return downloadFile(`/finance/report/export?year=${y}&month=${Number(m)}`, `rapport-financier-${y}-${m}.xlsx`);
    },
    onSuccess: () => {
      toast.success('Rapport téléchargé ✅');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le rapport n'a pas pu être créé."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Rapport financier (Excel)" description="Un fichier Excel avec le résumé, la liste des transactions et les arriérés.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-mist-200 p-1">
          {([['mois', 'Rapport mensuel'], ['annee', 'Rapport annuel']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === value ? 'bg-white text-mims-700 shadow-soft' : 'text-ink-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'mois' ? (
          <div>
            <label className="label">Mois</label>
            <input type="month" className="input" value={month} max={todayInputValue().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="label">Année</label>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-ink-500">Le rapport annuel ajoute le détail mois par mois et l'évolution du solde.</p>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => download.mutate()} disabled={download.isPending}>
            {download.isPending ? <Spinner /> : <DownloadIcon width={16} height={16} />} Télécharger
          </button>
        </div>
      </div>
    </Modal>
  );
}
