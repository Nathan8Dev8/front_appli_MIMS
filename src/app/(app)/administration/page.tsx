'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';
import { ShieldIcon } from '@/components/ui/icons';
import { ROLE_LABELS } from '@/store/auth-store';
import { formatDateTime } from '@/lib/format';
import type { AppFeedback, FeedbackStatus, MemberSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { FEEDBACK_STATUS } from '@/components/feedback/feedback';

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
      <Suspense fallback={null}>
        <AdministrationContent />
      </Suspense>
    </RequireRole>
  );
}

type AdminTab = 'roles' | 'retours' | 'audit';

function AdministrationContent() {
  // ?tab=retours : ouverture directe depuis la notification d'un nouveau signalement.
  const initial = useSearchParams().get('tab');
  const [tab, setTab] = useState<AdminTab>(initial === 'retours' || initial === 'audit' ? initial : 'roles');
  const { data: feedback } = useQuery({ queryKey: ['feedback', 'all'], queryFn: () => api.get<AppFeedback[]>('/feedback') });
  const newCount = (feedback ?? []).filter((f) => f.status === 'NOUVEAU').length;

  return (
    <div>
      <PageHeader
        eyebrow="Gestion"
        title="Administration"
        description="Les rôles du bureau, les retours sur l'appli et le journal des actions. Les bilans de la caisse sont dans l'Historique."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'roles', label: 'Rôles' },
          { value: 'retours', label: "Retours sur l'appli", badge: newCount },
          { value: 'audit', label: 'Journal des actions' },
        ]}
      />

      {tab === 'roles' && <RolesTab />}
      {tab === 'retours' && <FeedbackTab items={feedback} />}
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

/** Bugs et idées envoyés par les membres : statut + réponse visible par la personne. */
function FeedbackTab({ items }: { items?: AppFeedback[] }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'tout' | 'BUG' | 'AMELIORATION'>('tout');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const update = useMutation({
    mutationFn: (v: { id: string; status: FeedbackStatus; adminNote?: string }) => api.patch(`/feedback/${v.id}`, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Mis à jour, la personne est prévenue ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La mise à jour n'a pas marché."),
  });

  if (!items) return <Spinner className="h-7 w-7 text-mims-700" />;
  const list = items.filter((f) => kind === 'tout' || f.kind === kind);

  return (
    <div>
      <Tabs
        className="mb-4"
        value={kind}
        onChange={setKind}
        items={[
          { value: 'tout', label: 'Tout' },
          { value: 'BUG', label: '🐞 Bugs', badge: items.filter((f) => f.kind === 'BUG' && f.status === 'NOUVEAU').length },
          { value: 'AMELIORATION', label: '✨ Idées' },
        ]}
      />
      {!list.length ? (
        <EmptyState title="Aucun retour pour l'instant 👌" description="Les membres envoient bugs et idées depuis « Signaler un bug ou une idée » dans le menu." />
      ) : (
        <ul className="space-y-3">
          {list.map((f) => (
            <li key={f.id} className="card p-4 sm:p-5">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={FEEDBACK_STATUS[f.status].variant}>{FEEDBACK_STATUS[f.status].label}</Badge>
                <span className="text-xs text-ink-500">{f.kind === 'BUG' ? '🐞 Bug' : '✨ Idée'} · {formatDateTime(f.createdAt)}</span>
              </div>
              <p className="font-semibold text-ink-900">{f.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{f.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                {f.author && (
                  <span className="flex items-center gap-1.5">
                    <Avatar firstName={f.author.firstName} lastName={f.author.lastName} avatarUrl={f.author.avatarUrl} size="sm" />
                    {f.author.firstName} {f.author.lastName}
                  </span>
                )}
                {f.page && <span>· page <code className="rounded bg-mist-200 px-1">{f.page}</code></span>}
                {f.screenshotName && (
                  <button className="font-semibold text-mims-700" onClick={() => downloadFile(`/feedback/${f.id}/screenshot`, f.screenshotName!).catch(() => toast.error('Capture introuvable.'))}>
                    · 🖼️ Capture
                  </button>
                )}
              </div>
              {f.device && <p className="mt-1 break-all text-[11px] text-ink-500">{f.device}</p>}

              <div className="mt-3 border-t border-ink-300/30 pt-3">
                <label className="label" htmlFor={`note-${f.id}`}>Réponse à la personne (optionnel)</label>
                <input
                  id={`note-${f.id}`}
                  className="input"
                  placeholder="Ex. Corrigé dans la dernière version, merci !"
                  value={notes[f.id] ?? f.adminNote ?? ''}
                  onChange={(e) => setNotes({ ...notes, [f.id]: e.target.value })}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['PRIS_EN_COMPTE', 'TERMINE', 'NON_RETENU'] as const).map((status) => (
                    <button
                      key={status}
                      disabled={update.isPending || f.status === status}
                      onClick={() => update.mutate({ id: f.id, status, adminNote: notes[f.id] ?? f.adminNote ?? '' })}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        f.status === status ? 'bg-mims-700 text-white' : 'bg-mist-200 text-ink-700 hover:bg-mims-50'
                      }`}
                    >
                      {FEEDBACK_STATUS[status].label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
