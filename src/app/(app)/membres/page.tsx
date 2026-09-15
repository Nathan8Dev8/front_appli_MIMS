'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge, MemberStatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PlusIcon, SearchIcon } from '@/components/ui/icons';
import { STAFF_ROLES } from '@/lib/nav';
import { ROLE_LABELS } from '@/store/auth-store';
import { formatDate } from '@/lib/format';
import type { MemberSummary } from '@/lib/types';

export default function MembresPage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      <MembresContent />
    </RequireRole>
  );
}

const ASSIGNABLE_ROLES = ['MEMBRE', 'SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'] as const;

function MembresContent() {
  const { data: me } = useMe();
  const isAdmin = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN']);
  // Seul le Président/Admin peut enregistrer de nouveaux membres et leur attribuer un rôle.
  const canCreateMember = hasRole(me, ['PRESIDENT_ADMIN']);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<MemberSummary | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'all', search],
    queryFn: () => api.get<MemberSummary[]>(`/members${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Communauté"
        title="Membres"
        description="Le registre vivant de notre communauté — identité, statut et engagement de chacun."
        actions={
          canCreateMember && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Ajouter un membre
            </button>
          )
        }
      />

      <div className="relative mb-6 max-w-sm">
        <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          className="input pl-11"
          placeholder="Rechercher un nom, un téléphone, un code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !members?.length ? (
        <EmptyState title="Aucun membre trouvé" description="Ajuste ta recherche ou ajoute un nouveau membre." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="card animate-fade-up flex items-center gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-hover"
            >
              <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{m.firstName} {m.lastName}</p>
                <p className="truncate text-xs text-ink-500">{m.phone}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <MemberStatusBadge status={m.status} />
                  {m.roles?.filter((r) => r.role.code !== 'MEMBRE').map((r) => (
                    <Badge key={r.role.code} variant="info">{ROLE_LABELS[r.role.code] ?? r.role.label}</Badge>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {canCreateMember && (
        <CreateMemberModal open={createOpen} onClose={() => setCreateOpen(false)} canAssignRole={canCreateMember} />
      )}
      <MemberDetailModal member={selected} onClose={() => setSelected(null)} isAdmin={isAdmin} />
    </div>
  );
}

function CreateMemberModal({
  open,
  onClose,
  canAssignRole,
}: {
  open: boolean;
  onClose: () => void;
  canAssignRole: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', role: 'MEMBRE' as (typeof ASSIGNABLE_ROLES)[number] });
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);

  const create = useMutation({
    mutationFn: () => api.post<{ username: string; temporaryPassword: string }>('/members', form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setCredentials(res);
      toast.success('Membre ajouté avec succès !');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'ajout a échoué."),
  });

  function handleClose() {
    setForm({ firstName: '', lastName: '', phone: '', email: '', role: 'MEMBRE' });
    setCredentials(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Ajouter un membre" description="Un compte sera créé automatiquement avec un mot de passe temporaire à changer à la première connexion.">
      {credentials ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-mims-50 p-4">
            <p className="text-sm text-ink-700">Transmets ces identifiants au nouveau membre :</p>
            <p className="mt-2 font-mono text-sm text-mims-800">Identifiant : <b>{credentials.username}</b></p>
            <p className="font-mono text-sm text-mims-800">Mot de passe : <b>{credentials.temporaryPassword}</b></p>
          </div>
          <button className="btn-primary w-full" onClick={handleClose}>Terminé</button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label className="label">E-mail (optionnel)</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {canAssignRole && (
            <div>
              <label className="label">Rôle dans l'application</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ASSIGNABLE_ROLES)[number] })}>
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
                ))}
              </select>
              {form.role !== 'MEMBRE' && (
                <p className="mt-1.5 text-xs text-ink-500">
                  Ce membre aura aussi les droits « {ROLE_LABELS[form.role]} » dès sa première connexion.
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Créer le membre
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function MemberDetailModal({ member, onClose, isAdmin }: { member: MemberSummary | null; onClose: () => void; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const statuses = ['ACTIF', 'INACTIF', 'SUSPENDU', 'DEMISSIONNAIRE'];

  const setStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/members/${member!.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Statut mis à jour.');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Mise à jour impossible.'),
  });

  if (!member) return null;

  return (
    <Modal open={!!member} onClose={onClose} title={`${member.firstName} ${member.lastName}`}>
      <div className="flex items-center gap-4">
        <Avatar firstName={member.firstName} lastName={member.lastName} avatarUrl={member.avatarUrl} size="lg" />
        <div>
          <p className="text-sm text-ink-700">{member.phone}</p>
          {member.email && <p className="text-sm text-ink-500">{member.email}</p>}
          <p className="mt-1 text-xs text-ink-500">Membre depuis le {formatDate(member.joinedAt)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {member.roles?.map((r) => <Badge key={r.role.code} variant="info">{ROLE_LABELS[r.role.code] ?? r.role.label}</Badge>)}
      </div>

      {isAdmin && (
        <div className="mt-6 border-t border-ink-300/30 pt-5">
          <p className="label">Changer le statut</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatus.mutate(s)}
                disabled={setStatus.isPending || member.status === s}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  member.status === s ? 'bg-mims-700 text-white' : 'bg-mist-200 text-ink-700 hover:bg-mims-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
