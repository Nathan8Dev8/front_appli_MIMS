'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { SearchIcon, SparkleIcon, UsersIcon } from '@/components/ui/icons';
import { foldText } from '@/lib/finance';
import { formatDate, formatFcfa } from '@/lib/format';
import type { MemberFinanceRow } from '@/lib/types';

export type MemberFilter = 'TOUS' | 'EN_DETTE' | 'A_JOUR';

export function MembersPanel({
  rows,
  filter,
  onFilterChange,
  onCollect,
}: {
  rows: MemberFinanceRow[];
  filter: MemberFilter;
  onFilterChange: (f: MemberFilter) => void;
  onCollect: (m: MemberFinanceRow) => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => ({
      TOUS: rows.length,
      EN_DETTE: rows.filter((r) => r.situation === 'EN_DETTE').length,
      A_JOUR: rows.filter((r) => r.situation === 'A_JOUR').length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const tokens = foldText(query).split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (filter !== 'TOUS' && r.situation !== filter) return false;
      if (!tokens.length) return true;
      const hay = foldText(`${r.firstName} ${r.lastName} ${r.memberCode} ${r.phone}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [rows, filter, query]);

  const generate = useMutation({
    mutationFn: () => api.post<{ created: number }>('/dues/generate'),
    onSuccess: (res) => {
      toast.success(res?.created ? `${res.created} échéance${res.created > 1 ? 's' : ''} créée${res.created > 1 ? 's' : ''} pour ce mois ✅` : 'Les échéances du mois existent déjà.');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dues'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Les échéances n'ont pas pu être créées."),
  });

  const tabs: { value: MemberFilter; label: string }[] = [
    { value: 'TOUS', label: 'Tous' },
    { value: 'EN_DETTE', label: 'Avec dettes' },
    { value: 'A_JOUR', label: 'À jour' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex self-start rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-300/40">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => onFilterChange(t.value)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${filter === t.value ? 'bg-mims-700 text-white' : 'text-ink-700 hover:bg-mims-50'}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs ${filter === t.value ? 'bg-white/20' : 'bg-mist-300 text-ink-700'}`}>{counts[t.value]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-3 lg:max-w-xl lg:justify-end">
          <div className="relative flex-1">
            <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input data-no-emoji className="input !pl-10" placeholder="Rechercher un membre…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn-secondary shrink-0 !px-4" onClick={() => generate.mutate()} disabled={generate.isPending} title="Crée l'échéance de 500 FCFA du mois pour chaque membre actif">
            {generate.isPending ? <Spinner /> : <SparkleIcon width={16} height={16} />}
            <span className="hidden sm:inline">Échéances du mois</span>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title={query ? 'Aucun membre ne correspond' : filter === 'EN_DETTE' ? 'Personne n’a de dette' : 'Aucun membre'}
          description={query ? 'Essaie un autre nom ou un autre code.' : filter === 'EN_DETTE' ? 'Tous les membres sont à jour de leurs cotisations.' : undefined}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-300/30 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3">Membre</th>
                <th className="px-3 py-3">Situation</th>
                <th className="px-3 py-3 text-right">Dette</th>
                <th className="hidden px-3 py-3 text-right md:table-cell">Avance</th>
                <th className="hidden px-3 py-3 lg:table-cell">Dernier versement</th>
                <th className="hidden px-3 py-3 lg:table-cell">Inscription</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/30">
              {visible.map((r) => (
                <tr key={r.id} className="transition hover:bg-mims-50/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar firstName={r.firstName} lastName={r.lastName} avatarUrl={r.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-ink-500">{r.memberCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {r.situation === 'EN_DETTE' ? (
                      <Badge variant="danger">En retard · {r.monthsLate} mois</Badge>
                    ) : (
                      <Badge variant="success">À jour</Badge>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold ${r.totalDebt > 0 ? 'text-rose-600' : 'text-ink-500'}`}>
                    {r.totalDebt > 0 ? formatFcfa(r.totalDebt) : '—'}
                  </td>
                  <td className="hidden px-3 py-3 text-right md:table-cell">
                    {r.advanceCredit > 0 ? (
                      <span className="font-semibold text-emerald-600">{formatFcfa(r.advanceCredit)}</span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-ink-500 lg:table-cell">{r.lastPaymentAt ? formatDate(r.lastPaymentAt) : 'Jamais'}</td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    {r.inscriptionPaid ? <Badge variant="success">Payée</Badge> : <Badge variant="warning">Non payée</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => onCollect(r)}>Encaisser</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
