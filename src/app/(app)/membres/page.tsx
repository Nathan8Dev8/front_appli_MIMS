'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge, DueStatusBadge, MemberStatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PlusIcon, SearchIcon } from '@/components/ui/icons';
import { STAFF_ROLES } from '@/lib/nav';
import { ROLE_LABELS } from '@/store/auth-store';
import { formatDate, formatFcfa, formatMonth } from '@/lib/format';
import type { EventKind, MemberSummary, MonthlyDue } from '@/lib/types';

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
        eyebrow="Le groupe"
        title="Membres"
        description="La liste des membres : identité, statut et rôle de chacun."
        actions={
          canCreateMember && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Ajouter un membre
            </button>
          )
        }
      />

      <div className="relative mb-6 sm:max-w-sm">
        <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          data-no-emoji
          className="input pl-11"
          placeholder="Rechercher un nom, un téléphone, un code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !members?.length ? (
        <EmptyState title="Aucun membre trouvé" description="Essaie une autre recherche ou ajoute un nouveau membre." />
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
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <MemberStatusBadge status={m.status} />
                  {m.onboarding && m.onboarding.status !== 'TERMINE' && m.status === 'ACTIF' && <Badge variant="gold">Nouveau</Badge>}
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
      toast.success('Membre ajouté ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le membre n'a pas pu être ajouté."),
  });

  function handleClose() {
    setForm({ firstName: '', lastName: '', phone: '', email: '', role: 'MEMBRE' });
    setCredentials(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Ajouter un membre" description="Un compte est créé avec un mot de passe temporaire. La personne le changera à sa première connexion.">
      {credentials ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-mims-50 p-4">
            <p className="text-sm text-ink-700">Envoie-lui ces identifiants :</p>
            <p className="mt-2 font-mono text-sm text-mims-800">Identifiant : <b>{credentials.username}</b></p>
            <p className="font-mono text-sm text-mims-800">Mot de passe : <b>{credentials.temporaryPassword}</b></p>
            <p className="mt-3 text-xs text-ink-500">
              À sa première connexion, il choisira son mot de passe puis l'appli le guidera : profil, notifications, règlement.
            </p>
          </div>
          <InviteActions message={inviteMessage(form.firstName, credentials)} />
          <button className="btn-ghost w-full" onClick={handleClose}>Fermer</button>
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
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
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

function inviteMessage(firstName: string, c: { username: string; temporaryPassword: string }) {
  const url = typeof window !== 'undefined' ? window.location.origin : '';
  return [
    `Bienvenue chez les Jeunes MIMS, ${firstName} ! 👋`,
    `Ton espace membre : ${url}`,
    `Identifiant : ${c.username}`,
    `Mot de passe provisoire : ${c.temporaryPassword}`,
    "Tu choisiras ton propre mot de passe à la première connexion. Ajoute l'appli à ton écran d'accueil pour recevoir les notifications.",
  ].join('\n');
}

/** Partage natif du téléphone (WhatsApp, SMS… au choix de l'expéditeur) ou copie du message. */
function InviteActions({ message }: { message: string }) {
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {canShare && (
        <button className="btn-primary" onClick={() => navigator.share({ text: message }).catch(() => undefined)}>
          Partager l'invitation
        </button>
      )}
      <button
        className={canShare ? 'btn-secondary' : 'btn-primary sm:col-span-2'}
        onClick={() =>
          navigator.clipboard
            .writeText(message)
            .then(() => toast.success("Message copié, colle-le où tu veux ✅"))
            .catch(() => toast.error("La copie n'a pas marché, recopie les identifiants à la main."))
        }
      >
        Copier le message
      </button>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = { ACTIF: 'Actif', INACTIF: 'Inactif', SUSPENDU: 'Suspendu', DEMISSIONNAIRE: 'Démissionnaire' };

interface AttendanceRow {
  attended: boolean | null;
  event: { id: string; title: string; kind: EventKind; startsAt: string };
}

function MemberDetailModal({ member, onClose, isAdmin }: { member: MemberSummary | null; onClose: () => void; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canSeeDues = hasRole(me, ['SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN']);

  const { data: dues } = useQuery({
    queryKey: ['dues', 'member', member?.id],
    queryFn: () => api.get<MonthlyDue[]>(`/dues/member/${member!.id}`),
    enabled: !!member && canSeeDues,
  });
  const { data: attendance } = useQuery({
    queryKey: ['events', 'attendance', member?.id],
    queryFn: () => api.get<AttendanceRow[]>(`/events/attendance/${member!.id}`),
    enabled: !!member,
  });

  const remind = useMutation({
    mutationFn: () => api.post(`/onboarding/${member!.id}/remind`),
    onSuccess: () => toast.success('Rappel envoyé ✅'),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le rappel n'est pas parti."),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/members/${member!.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Statut mis à jour ✅');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le statut n'a pas pu être changé."),
  });

  if (!member) return null;

  // Comme côté serveur : un mois non soldé devient une dette le lendemain de son 2e dimanche (dueDate).
  const unpaid = (dues ?? []).filter(
    (d) => (d.status === 'A_PAYER' || d.status === 'PARTIEL') && new Date(d.dueDate).getTime() + 86_400_000 <= Date.now(),
  );
  const debt = unpaid.reduce((s, d) => s + d.balance, 0);
  const present = (attendance ?? []).filter((a) => a.attended).length;

  return (
    <Modal open={!!member} onClose={onClose} title={`${member.firstName} ${member.lastName}`} maxWidth="max-w-2xl">
      <div className="flex items-center gap-4">
        <Avatar firstName={member.firstName} lastName={member.lastName} avatarUrl={member.avatarUrl} size="lg" />
        <div className="min-w-0">
          <a href={`tel:${member.phone}`} className="text-sm font-semibold text-mims-700">{member.phone}</a>
          {member.email && <p className="truncate text-sm text-ink-500">{member.email}</p>}
          <p className="mt-1 text-xs text-ink-500">{member.memberCode} · membre depuis le {formatDate(member.joinedAt)}</p>
          <p className="text-xs text-ink-500">
            {member.birthDate ? `🎂 ${formatDate(member.birthDate, { day: 'numeric', month: 'long', timeZone: 'UTC' })}` : 'Date de naissance pas encore renseignée'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <MemberStatusBadge status={member.status} />
        {member.roles?.filter((r) => r.role.code !== 'MEMBRE').map((r) => <Badge key={r.role.code} variant="info">{ROLE_LABELS[r.role.code] ?? r.role.label}</Badge>)}
      </div>

      {member.onboarding && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist-200/70 p-4">
          <div>
            <p className="label !mb-0.5">Intégration</p>
            <p className="text-sm text-ink-700">
              {member.onboarding.status === 'TERMINE'
                ? member.onboarding.completedAt
                  ? `Règlement accepté le ${formatDate(member.onboarding.completedAt)}`
                  : 'Terminée'
                : "Pas encore terminée : n'a pas accepté le règlement"}
            </p>
          </div>
          {isAdmin && member.onboarding.status !== 'TERMINE' && (
            <button className="btn-secondary !px-4 !py-2 text-xs" onClick={() => remind.mutate()} disabled={remind.isPending}>
              {remind.isPending && <Spinner />} Relancer
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {canSeeDues && (
          <div className="rounded-2xl bg-mist-200/70 p-4">
            <p className="label !mb-1">Cotisations</p>
            {dues === undefined ? (
              <Spinner className="h-5 w-5 text-mims-700" />
            ) : (
              <>
                <p className={`font-display text-xl font-semibold ${debt ? 'text-rose-600' : 'text-emerald-600'}`}>{debt ? formatFcfa(debt) : 'À jour'}</p>
                <p className="text-xs text-ink-500">{unpaid.length ? `${unpaid.length} mois en retard` : `${dues.length} mois suivis`}</p>
                <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {dues.slice(0, 12).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="capitalize text-ink-700">{formatMonth(d.dueMonth)}</span>
                      <DueStatusBadge status={d.status} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-mist-200/70 p-4">
          <p className="label !mb-1">Présences</p>
          {attendance === undefined ? (
            <Spinner className="h-5 w-5 text-mims-700" />
          ) : (
            <>
              <p className="font-display text-xl font-semibold text-ink-900">{present} / {attendance.length}</p>
              <p className="text-xs text-ink-500">réunions et activités pointées</p>
              <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {attendance.slice(0, 12).map((a) => (
                  <li key={a.event.id} className="flex items-center justify-between gap-2 text-xs">
                    <Link href={`/evenements/${a.event.id}`} className="min-w-0 truncate text-ink-700 hover:text-mims-700">
                      {formatDate(a.event.startsAt)} · {a.event.title}
                    </Link>
                    <Badge variant={a.attended ? 'success' : 'neutral'}>{a.attended ? 'Présent' : 'Absent'}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-6 border-t border-ink-300/30 pt-5">
          <p className="label">Changer le statut</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setStatus.mutate(s)}
                disabled={setStatus.isPending || member.status === s}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  member.status === s ? 'bg-mims-700 text-white' : 'bg-mist-200 text-ink-700 hover:bg-mims-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
