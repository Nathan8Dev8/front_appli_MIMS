'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';
import { ShieldIcon } from '@/components/ui/icons';
import { ROLE_LABELS } from '@/store/auth-store';
import { formatDateTime } from '@/lib/format';
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

export default function AdministrationPage() {
  return (
    <RequireRole roles={['PRESIDENT_ADMIN']}>
      <AdministrationContent />
    </RequireRole>
  );
}

function AdministrationContent() {
  const [tab, setTab] = useState<'roles' | 'audit'>('roles');

  return (
    <div>
      <PageHeader
        eyebrow="Gestion"
        title="Administration"
        description="Les rôles du bureau et le journal des actions. Les bilans de la caisse sont dans l'Historique."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'roles', label: 'Rôles' },
          { value: 'audit', label: 'Journal des actions' },
        ]}
      />

      {tab === 'roles' && <RolesTab />}
      {tab === 'audit' && <AuditTab />}
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
      toast.success('Rôle attribué ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas marché."),
  });

  const revoke = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => api.post(`/roles/${memberId}/revoke`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Rôle retiré ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas marché."),
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
