'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowDownLeftIcon, ArrowRightIcon, ArrowUpRightIcon, ReceiptIcon } from '@/components/ui/icons';
import { CashHero } from '@/components/finance/cash-hero';
import { LiveStatus } from '@/components/finance/live-status';
import { ReminderBar } from '@/components/finance/reminder-bar';
import { CollectesPanel } from '@/components/finance/collectes-panel';
import { EntryModal, type EntryNature } from '@/components/finance/entry-modal';
import { ExpenseModal } from '@/components/finance/expense-modal';
import { MembersPanel, type MemberFilter } from '@/components/finance/members-panel';
import { TransactionTable } from '@/components/finance/transaction-table';
import { formatDate, formatFcfa } from '@/lib/format';
import { LIVE_REFRESH_MS } from '@/lib/finance';
import type { CashSummary, CollecteSummary, MemberFinanceRow, Payment, TransactionsPage, TxNature } from '@/lib/types';

type Tab = 'membres' | 'collectes' | 'operations';

export function TreasuryPanel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('membres');
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('TOUS');
  const [entry, setEntry] = useState<{ open: boolean; initial?: { nature?: EntryNature; memberId?: string; collecteId?: string } }>({ open: false });
  const [expense, setExpense] = useState<{ open: boolean; initial?: { category?: TxNature; collecteId?: string; amount?: number; label?: string } }>({ open: false });

  const { data: summary, dataUpdatedAt, isFetching } = useQuery({ queryKey: ['finance', 'summary'], queryFn: () => api.get<CashSummary>('/finance/summary'), refetchInterval: LIVE_REFRESH_MS, refetchOnWindowFocus: true });
  const { data: members } = useQuery({ queryKey: ['finance', 'members'], queryFn: () => api.get<MemberFinanceRow[]>('/finance/members'), refetchInterval: LIVE_REFRESH_MS, refetchOnWindowFocus: true });
  const { data: collectes } = useQuery({ queryKey: ['finance', 'collectes'], queryFn: () => api.get<CollecteSummary[]>('/finance/collectes'), refetchInterval: LIVE_REFRESH_MS, refetchOnWindowFocus: true });
  const { data: recent } = useQuery({
    queryKey: ['finance', 'transactions', 'recent'],
    queryFn: () => api.get<TransactionsPage>('/finance/transactions?pageSize=10'),
    enabled: tab === 'operations',
    refetchInterval: LIVE_REFRESH_MS,
  });
  // Versements enregistrés avant la validation automatique : on les garde visibles pour ne rien laisser en suspens.
  const { data: payments } = useQuery({ queryKey: ['payments', 'all'], queryFn: () => api.get<Payment[]>('/payments') });
  const pending = (payments ?? []).filter((p) => p.status === 'EN_ATTENTE');

  const confirmPayment = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/confirm`),
    onSuccess: () => {
      toast.success('Paiement validé, le reçu est envoyé ✅');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dues'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le paiement n'a pas pu être validé."),
  });

  const memberRows = members ?? [];
  const collecteRows = collectes ?? [];
  const openCollectes = collecteRows.filter((c) => c.status === 'OUVERTE').length;

  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: 'membres', label: 'Suivi des membres', badge: summary?.arrears.debtors },
    { value: 'collectes', label: 'Collectes', badge: openCollectes || undefined },
    { value: 'operations', label: 'Dernières opérations' },
  ];

  return (
    <div className="space-y-6">
      <ReminderBar debtors={summary?.arrears.debtors ?? 0} />

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={() => setEntry({ open: true })}>
          <ArrowDownLeftIcon width={16} height={16} /> Enregistrer une entrée
        </button>
        <button className="btn-secondary !text-rose-600" onClick={() => setExpense({ open: true })}>
          <ArrowUpRightIcon width={16} height={16} /> Enregistrer une sortie
        </button>
        <Link href="/transactions" className="btn-ghost">
          <ReceiptIcon width={16} height={16} /> Toutes les transactions
        </Link>
        <LiveStatus className="ml-auto" updatedAt={dataUpdatedAt} fetching={isFetching} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['finance'] })} />
      </div>

      <CashHero
        summary={summary}
        onSeeDebtors={() => {
          setMemberFilter('EN_DETTE');
          setTab('membres');
        }}
      />

      {!!pending.length && (
        <div className="card border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900">En attente de validation ({pending.length})</h3>
          <ul className="divide-y divide-amber-100">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink-900">{p.member?.firstName} {p.member?.lastName} · {formatFcfa(p.amount)}</p>
                  <p className="text-xs text-ink-500">{formatDate(p.paidAt)} · Réf. {p.paymentRef}</p>
                </div>
                <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => confirmPayment.mutate(p.id)} disabled={confirmPayment.isPending}>
                  Valider &amp; générer le reçu
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-ink-300/40">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition ${tab === t.value ? 'text-mims-700' : 'text-ink-500 hover:text-ink-900'}`}
          >
            {t.label}
            {!!t.badge && <span className="rounded-full bg-mims-100 px-1.5 text-xs text-mims-700">{t.badge}</span>}
            {tab === t.value && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-mims-700" />}
          </button>
        ))}
      </div>

      {tab === 'membres' && (
        <MembersPanel
          rows={memberRows}
          filter={memberFilter}
          onFilterChange={setMemberFilter}
          onCollect={(m) => setEntry({ open: true, initial: { nature: 'COTISATION', memberId: m.id } })}
        />
      )}

      {tab === 'collectes' && (
        <CollectesPanel
          collectes={collecteRows}
          onContribute={(c) => setEntry({ open: true, initial: { nature: 'COLLECTE', collecteId: c.id } })}
          onRemit={(c) =>
            setExpense({
              open: true,
              initial: { category: 'REMISE_COLLECTE', collecteId: c.id, amount: Math.max(c.remaining, 0), label: `Remise de la collecte « ${c.title} »` },
            })
          }
        />
      )}

      {tab === 'operations' && (
        <div className="card overflow-hidden">
          {!recent?.items.length ? (
            <div className="p-6"><EmptyState icon={<ReceiptIcon />} title="Aucune opération enregistrée" description="Les entrées et sorties de la caisse s'afficheront ici." /></div>
          ) : (
            <>
              <TransactionTable items={recent.items} />
              <div className="border-t border-ink-300/30 px-5 py-3 text-right">
                <Link href="/transactions" className="inline-flex items-center gap-1 text-sm font-semibold text-mims-700 hover:text-mims-800">
                  Toutes les transactions <ArrowRightIcon width={16} height={16} />
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      <EntryModal open={entry.open} onClose={() => setEntry({ open: false })} members={memberRows} collectes={collecteRows} initial={entry.initial} />
      <ExpenseModal open={expense.open} onClose={() => setExpense({ open: false })} balance={summary?.balance ?? 0} collectes={collecteRows} initial={expense.initial} />
    </div>
  );
}
