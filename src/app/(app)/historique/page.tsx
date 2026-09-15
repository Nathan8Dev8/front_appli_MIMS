'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Avatar } from '@/components/ui/avatar';
import { Badge, DocumentStatusBadge, MemberStatusBadge, PaymentStatusBadge } from '@/components/ui/badge';
import { FileTextIcon, SearchIcon, UsersIcon, WalletIcon } from '@/components/ui/icons';
import { formatDate, formatFcfa, formatMonth } from '@/lib/format';
import { ROLE_LABELS } from '@/store/auth-store';
import { STAFF_ROLES } from '@/lib/nav';
import type { AppDocument, MemberSummary, Payment } from '@/lib/types';

type Tab = 'reunions' | 'cotisations' | 'membres';

export default function HistoriquePage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      <HistoriqueContent />
    </RequireRole>
  );
}

function HistoriqueContent() {
  const { data: me } = useMe();
  const canSeeCotisations = hasRole(me, ['TRESORIER', 'PRESIDENT_ADMIN']);
  const [tab, setTab] = useState<Tab>('reunions');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'reunions', label: 'Réunions & PV' },
    ...(canSeeCotisations ? ([{ key: 'cotisations', label: 'Cotisations' }] as const) : []),
    { key: 'membres', label: 'Membres' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Archives du bureau"
        title="Historique"
        description="Tous les rapports de séances, l'historique des cotisations et la liste des membres — recherche par date, titre ou nom."
      />

      <div className="mb-6 inline-flex flex-wrap rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-300/40">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-mims-700 text-white' : 'text-ink-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reunions' && <ReunionsTab />}
      {tab === 'cotisations' && canSeeCotisations && <CotisationsTab />}
      {tab === 'membres' && <MembresTab />}
    </div>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">{children}</div>;
}

function ReunionsTab() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', 'historique-pv'],
    queryFn: () => api.get<AppDocument[]>('/documents?type=PV'),
  });

  const filtered = useMemo(() => {
    return (documents ?? []).filter((d) => {
      const matchesTitle = !search || d.title.toLowerCase().includes(search.toLowerCase());
      const reference = d.publishedAt ?? d.createdAt;
      const matchesDate = !date || reference.slice(0, 10) === date;
      return matchesTitle && matchesDate;
    });
  }, [documents, search, date]);

  return (
    <div>
      <FilterBar>
        <div className="relative flex-1">
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input pl-11" placeholder="Rechercher un rapport par titre…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <input type="date" className="input sm:w-52" value={date} onChange={(e) => setDate(e.target.value)} />
        {(search || date) && (
          <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { setSearch(''); setDate(''); }}>
            Réinitialiser
          </button>
        )}
      </FilterBar>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !filtered.length ? (
        <EmptyState icon={<FileTextIcon />} title="Aucun rapport de séance trouvé" description="Ajuste ta recherche ou la date sélectionnée." />
      ) : (
        <div className="card overflow-x-auto p-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="pb-3">Titre</th>
                <th className="pb-3">Date de publication</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/30">
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 font-medium text-ink-900">{d.title}</td>
                  <td className="py-3 text-ink-500">{formatDate(d.publishedAt ?? d.createdAt)}</td>
                  <td className="py-3"><DocumentStatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CotisationsTab() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', 'historique'],
    queryFn: () => api.get<Payment[]>('/payments'),
  });

  const filtered = useMemo(() => {
    return (payments ?? []).filter((p) => {
      const fullName = `${p.member?.firstName ?? ''} ${p.member?.lastName ?? ''}`.toLowerCase();
      const matchesName = !search || fullName.includes(search.toLowerCase());
      const matchesDate = !date || p.paidAt.slice(0, 10) === date;
      return matchesName && matchesDate;
    });
  }, [payments, search, date]);

  const total = filtered.filter((p) => p.status === 'VALIDE').reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <FilterBar>
        <div className="relative flex-1">
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input pl-11" placeholder="Rechercher un membre…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <input type="date" className="input sm:w-52" value={date} onChange={(e) => setDate(e.target.value)} />
        {(search || date) && (
          <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { setSearch(''); setDate(''); }}>
            Réinitialiser
          </button>
        )}
      </FilterBar>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !filtered.length ? (
        <EmptyState icon={<WalletIcon />} title="Aucun versement trouvé" description="Ajuste ta recherche ou la date sélectionnée." />
      ) : (
        <div className="card overflow-x-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{filtered.length} versement(s)</p>
            <p className="text-sm font-semibold text-ink-900">Total validé : {formatFcfa(total)}</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="pb-3">Membre</th>
                <th className="pb-3">Montant</th>
                <th className="pb-3">Période(s)</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/30">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-ink-900">{p.member?.firstName} {p.member?.lastName}</td>
                  <td className={`py-3 ${p.amount < 0 ? 'text-rose-600' : 'text-ink-700'}`}>{formatFcfa(p.amount)}</td>
                  <td className="py-3 capitalize text-ink-500">
                    {p.allocations?.length ? p.allocations.map((a) => formatMonth(a.due.dueMonth)).join(', ') : '—'}
                  </td>
                  <td className="py-3 text-ink-500">{formatDate(p.paidAt)}</td>
                  <td className="py-3"><PaymentStatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MembresTab() {
  const [search, setSearch] = useState('');

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'historique'],
    queryFn: () => api.get<MemberSummary[]>('/members'),
  });

  const filtered = useMemo(() => {
    return (members ?? []).filter((m) => {
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      return !search || fullName.includes(search.toLowerCase()) || m.phone.includes(search);
    });
  }, [members, search]);

  return (
    <div>
      <FilterBar>
        <div className="relative flex-1">
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input pl-11" placeholder="Rechercher un membre par nom ou téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterBar>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !filtered.length ? (
        <EmptyState icon={<UsersIcon />} title="Aucun membre trouvé" description="Ajuste ta recherche." />
      ) : (
        <div className="card overflow-x-auto p-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="pb-3">Membre</th>
                <th className="pb-3">Rôle(s)</th>
                <th className="pb-3">Date d'inscription</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/30">
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size="sm" />
                      <div>
                        <p className="font-medium text-ink-900">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-ink-500">{m.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.roles?.filter((r) => r.role.code !== 'MEMBRE').length
                        ? m.roles.filter((r) => r.role.code !== 'MEMBRE').map((r) => (
                            <Badge key={r.role.code} variant="info">{ROLE_LABELS[r.role.code] ?? r.role.label}</Badge>
                          ))
                        : <Badge variant="neutral">Membre</Badge>}
                    </div>
                  </td>
                  <td className="py-3 text-ink-700">{formatDate(m.joinedAt)}</td>
                  <td className="py-3"><MemberStatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
