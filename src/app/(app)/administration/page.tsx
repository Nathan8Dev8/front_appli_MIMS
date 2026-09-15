'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/ui/stat-card';
import { ChartIcon, ShieldIcon, UsersIcon, WalletIcon } from '@/components/ui/icons';
import { ROLE_LABELS } from '@/store/auth-store';
import { formatDateTime, formatFcfa } from '@/lib/format';
import type { MemberSummary } from '@/lib/types';

const ASSIGNABLE_ROLES = ['SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];

interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
}

interface FinanceReport {
  year: number;
  byMonth: { month: number; total: number; count: number }[];
  totalCollected: number;
  totalDue: number;
  totalOutstanding: number;
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function AdministrationPage() {
  return (
    <RequireRole roles={['PRESIDENT_ADMIN']}>
      <AdministrationContent />
    </RequireRole>
  );
}

function AdministrationContent() {
  const [tab, setTab] = useState<'roles' | 'rapports' | 'audit'>('rapports');

  return (
    <div>
      <PageHeader eyebrow="Gouvernance" title="Administration" description="Rôles, bilans financiers et journal d'audit du groupe." />

      <div className="mb-6 inline-flex flex-wrap rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-300/40">
        {[
          { key: 'rapports', label: 'Bilans' },
          { key: 'roles', label: 'Rôles' },
          { key: 'audit', label: "Journal d'audit" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-mims-700 text-white' : 'text-ink-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rapports' && <ReportsTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

function ReportsTab() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'monthly-finance'],
    queryFn: () => api.get<FinanceReport>('/reports/monthly-finance'),
  });

  if (isLoading || !report) return <Spinner className="h-7 w-7 text-mims-700" />;
  const max = Math.max(...report.byMonth.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collecté cette année" value={formatFcfa(report.totalCollected)} icon={WalletIcon} tone="success" />
        <StatCard label="Total attendu" value={formatFcfa(report.totalDue)} icon={ChartIcon} />
        <StatCard label="Reste à percevoir" value={formatFcfa(report.totalOutstanding)} icon={UsersIcon} tone={report.totalOutstanding ? 'warning' : 'success'} />
      </div>

      <div className="card p-6">
        <h3 className="mb-5 font-display text-base font-semibold text-ink-900">Cotisations collectées par mois — {report.year}</h3>
        <div className="flex items-end gap-2.5" style={{ height: 180 }}>
          {report.byMonth.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-mims-600 transition-all"
                style={{ height: `${Math.max((m.total / max) * 140, m.total > 0 ? 6 : 2)}px` }}
                title={formatFcfa(m.total)}
              />
              <span className="text-[10px] font-medium text-ink-500">{MONTHS[m.month - 1]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RolesTab() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery({ queryKey: ['members', 'all'], queryFn: () => api.get<MemberSummary[]>('/members') });

  const assign = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => api.post(`/roles/${memberId}/assign`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Rôle attribué.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Échec.'),
  });

  const revoke = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => api.post(`/roles/${memberId}/revoke`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Rôle retiré.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Échec.'),
  });

  if (isLoading) return <Spinner className="h-7 w-7 text-mims-700" />;

  return (
    <div className="card overflow-x-auto p-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            <th className="pb-3">Membre</th>
            {ASSIGNABLE_ROLES.map((r) => <th key={r} className="pb-3">{ROLE_LABELS[r]}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-300/30">
          {members?.map((m) => {
            const activeRoles = m.roles?.filter((r) => r.role.code !== 'MEMBRE').map((r) => r.role.code) ?? [];
            return (
              <tr key={m.id}>
                <td className="py-3 font-medium text-ink-900">{m.firstName} {m.lastName}</td>
                {ASSIGNABLE_ROLES.map((role) => {
                  const has = activeRoles.includes(role);
                  return (
                    <td key={role} className="py-3">
                      <button
                        onClick={() => (has ? revoke : assign).mutate({ memberId: m.id, role })}
                        className={`h-6 w-6 rounded-md border-2 transition ${has ? 'border-mims-700 bg-mims-700' : 'border-ink-300'}`}
                        aria-label={`${has ? 'Retirer' : 'Attribuer'} ${role}`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab() {
  const { data: logs, isLoading } = useQuery({ queryKey: ['audit-logs'], queryFn: () => api.get<AuditEntry[]>('/audit-logs') });

  if (isLoading) return <Spinner className="h-7 w-7 text-mims-700" />;
  if (!logs?.length) return <EmptyState icon={<ShieldIcon />} title="Journal vide" />;

  return (
    <div className="card overflow-x-auto p-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            <th className="pb-3">Date</th>
            <th className="pb-3">Action</th>
            <th className="pb-3">Entité</th>
            <th className="pb-3">Intégrité</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-300/30">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="py-2.5 text-ink-500">{formatDateTime(log.occurredAt)}</td>
              <td className="py-2.5 font-medium text-ink-900">{log.action}</td>
              <td className="py-2.5 text-ink-700">{log.entityType}</td>
              <td className="py-2.5 font-mono text-xs text-emerald-600">✓ chaîné</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
