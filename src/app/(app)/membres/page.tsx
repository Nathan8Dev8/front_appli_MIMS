'use client';

import { useEffect, useState } from 'react';
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
import { METHODS, REGISTRATION_FEE } from '@/lib/finance';
import { Tabs } from '@/components/ui/tabs';
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
  // La Secrétaire et le Président/Admin enregistrent les nouveaux avec leur rôle (Président/Admin : réservé au Président).
  const canCreateMember = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN']);
  const isPresident = hasRole(me, ['PRESIDENT_ADMIN']);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('TOUS');

  // Raccourci « Ajouter un membre » de l'accueil (/membres?ajouter=1) : la fenêtre s'ouvre directement.
  useEffect(() => {
    if (canCreateMember && new URLSearchParams(window.location.search).has('ajouter')) setCreateOpen(true);
  }, [canCreateMember]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<MemberSummary | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'all', search],
    queryFn: () => api.get<MemberSummary[]>(`/members${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  const isNew = (m: MemberSummary) => !!m.onboarding && m.onboarding.status !== 'TERMINE' && m.status === 'ACTIF';
  const counts: Record<MemberFilter, number> = {
    TOUS: members?.length ?? 0,
    NOUVEAUX: members?.filter(isNew).length ?? 0,
    NON_PAYE: members?.filter((m) => m.inscriptionPaid == null).length ?? 0,
    INACTIFS: members?.filter((m) => m.status !== 'ACTIF').length ?? 0,
  };
  const shown = (members ?? []).filter((m) =>
    filter === 'NOUVEAUX' ? isNew(m) : filter === 'NON_PAYE' ? m.inscriptionPaid == null : filter === 'INACTIFS' ? m.status !== 'ACTIF' : true,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Le groupe"
        title="Membres"
        description="Touche un membre pour voir sa fiche."
        actions={
          canCreateMember && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Ajouter un membre
            </button>
          )
        }
      />

      <div className="relative mb-4 sm:max-w-md">
        <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          data-no-emoji
          className="input pl-11"
          aria-label="Rechercher un membre"
          placeholder="Chercher un nom ou un téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'TOUS', label: `Tous (${counts.TOUS})` },
          { value: 'NOUVEAUX', label: `Nouveaux (${counts.NOUVEAUX})` },
          { value: 'NON_PAYE', label: `Inscription non payée (${counts.NON_PAYE})` },
          { value: 'INACTIFS', label: `Inactifs (${counts.INACTIFS})` },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !shown.length ? (
        <EmptyState
          title="Aucun membre ici"
          description={search ? 'Essaie un autre nom ou un autre numéro.' : 'Aucun membre dans cette liste pour le moment.'}
        />
      ) : (
        <>
          {/* Téléphone : des cartes faciles à toucher. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {shown.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="card flex items-center gap-4 p-4 text-left transition hover:shadow-hover"
              >
                <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-ink-900">{m.firstName} {m.lastName}</p>
                  <p className="truncate text-sm text-ink-500">{m.phone}</p>
                  <MemberBadges member={m} isNew={isNew(m)} />
                </div>
              </button>
            ))}
          </div>
          {/* Ordinateur : un tableau, plus rapide à parcourir. */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-300/30 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Membre</th>
                  <th className="px-5 py-3 font-semibold">Téléphone</th>
                  <th className="px-5 py-3 font-semibold">Inscription</th>
                  <th className="px-5 py-3 font-semibold">Statut et rôle</th>
                  <th className="px-5 py-3"><span className="sr-only">Ouvrir</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {shown.map((m) => (
                  <tr key={m.id} onClick={() => setSelected(m)} className="cursor-pointer transition hover:bg-mims-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-ink-500">{m.memberCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{m.phone}</td>
                    <td className="px-5 py-3">
                      {m.inscriptionPaid != null ? <Badge variant="success">Payée · {formatFcfa(m.inscriptionPaid)}</Badge> : <Badge variant="warning">Pas encore payée</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <MemberBadges member={m} isNew={isNew(m)} hideInscription />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setSelected(m); }}>Voir la fiche</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canCreateMember && (
        <CreateMemberModal open={createOpen} onClose={() => setCreateOpen(false)} isPresident={isPresident} />
      )}
      <MemberDetailModal member={selected} onClose={() => setSelected(null)} isAdmin={isAdmin} />
    </div>
  );
}

type MemberFilter = 'TOUS' | 'NOUVEAUX' | 'NON_PAYE' | 'INACTIFS';

function MemberBadges({ member: m, isNew, hideInscription }: { member: MemberSummary; isNew: boolean; hideInscription?: boolean }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <MemberStatusBadge status={m.status} />
      {m.hasAccount === false && <Badge variant="neutral">Sans compte</Badge>}
      {isNew && <Badge variant="gold">Nouveau</Badge>}
      {!hideInscription && m.inscriptionPaid == null && <Badge variant="warning">Inscription non payée</Badge>}
      {m.roles?.filter((r) => r.role.code !== 'MEMBRE').map((r) => (
        <Badge key={r.role.code} variant="info">{ROLE_LABELS[r.role.code] ?? r.role.label}</Badge>
      ))}
    </div>
  );
}

const EMPTY_MEMBER_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  withAccount: true,
  role: 'MEMBRE' as (typeof ASSIGNABLE_ROLES)[number],
  paid: null as boolean | null,
  amount: String(REGISTRATION_FEE),
  method: 'CASH',
};

function CreateMemberModal({ open, onClose, isPresident }: { open: boolean; onClose: () => void; isPresident: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_MEMBER_FORM);
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const roles = ASSIGNABLE_ROLES.filter((r) => r !== 'PRESIDENT_ADMIN' || isPresident);
  const amount = Math.floor(Number(form.amount)) || 0;

  const create = useMutation({
    mutationFn: () =>
      api.post<{ username: string | null; temporaryPassword: string | null }>('/members', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        role: form.role,
        withAccount: form.withAccount,
        ...(form.paid ? { inscriptionAmount: amount, inscriptionMethod: form.method } : {}),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(form.paid ? `Membre ajouté ✅ ${formatFcfa(amount)} enregistrés en caisse` : 'Membre ajouté ✅');
    },
    onSettled: (res) => {
      if (!res) return;
      if (res.username && res.temporaryPassword) setCredentials({ username: res.username, temporaryPassword: res.temporaryPassword });
      else handleClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le membre n'a pas pu être ajouté. Vérifie les champs et réessaie."),
  });

  function handleClose() {
    setForm(EMPTY_MEMBER_FORM);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-first">Prénom</label>
              <input id="new-first" className="input" autoComplete="off" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="new-last">Nom</label>
              <input id="new-last" className="input" autoComplete="off" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-phone">Téléphone <span className="font-normal normal-case text-ink-500">(facultatif)</span></label>
              <input id="new-phone" type="tel" inputMode="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="new-email">E-mail <span className="font-normal normal-case text-ink-500">(facultatif)</span></label>
              <input id="new-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="new-role">Rôle dans le groupe</label>
            <select id="new-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ASSIGNABLE_ROLES)[number] })}>
              {roles.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
              ))}
            </select>
            {form.role !== 'MEMBRE' && (
              <p className="mt-1.5 text-xs text-ink-500">Il aura aussi les droits « {ROLE_LABELS[form.role]} » dès sa première connexion.</p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-mist-200/70 p-4 text-sm text-ink-700">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={!form.withAccount} onChange={(e) => setForm({ ...form, withAccount: !e.target.checked })} />
            <span>
              <b className="text-ink-900">Pas encore inscrit dans l'appli</b>
              <br />
              On suit ses cotisations sans lui créer de compte. Tu pourras lui créer son accès plus tard depuis sa fiche.
            </span>
          </label>

          <fieldset className="rounded-2xl bg-mist-200/70 p-4">
            <legend className="sr-only">Inscription</legend>
            <p className="text-base font-semibold text-ink-900">A-t-il payé l'inscription ?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { value: true, label: '✅ Oui' },
                { value: false, label: '⏳ Pas encore' },
              ].map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  aria-pressed={form.paid === o.value}
                  onClick={() => setForm({ ...form, paid: o.value })}
                  className={`rounded-xl px-4 py-3 text-base font-semibold ring-1 ring-inset transition ${
                    form.paid === o.value ? 'bg-mims-700 text-white ring-mims-700' : 'bg-white text-ink-700 ring-ink-300/60 hover:bg-mims-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {form.paid && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new-amount">Montant versé (F)</label>
                  <input
                    id="new-amount"
                    className="input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="new-method">Payé en</label>
                  <select id="new-method" className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <p className="text-xs text-ink-500 sm:col-span-2">Le montant entre en caisse et il reçoit son reçu automatiquement.</p>
              </div>
            )}
          </fieldset>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
            <button type="submit" className="btn-primary !py-3 text-base" disabled={create.isPending || form.paid === null || (form.paid && amount < 1)}>
              {create.isPending && <Spinner />}
              Enregistrer le membre
            </button>
          </div>
          {form.paid === null && <p className="text-center text-xs text-ink-500">Réponds à la question sur l'inscription pour continuer.</p>}
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

const STATUS_LABELS: Record<string, string> = { ACTIF: 'Actif', INACTIF: 'Inactif', SUSPENDU: 'Suspendu', DEMISSIONNAIRE: "N'est plus membre" };

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
          {member.phone && <a href={`tel:${member.phone}`} className="text-sm font-semibold text-mims-700">{member.phone}</a>}
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
                      <span className={d.note ? 'text-ink-700' : 'capitalize text-ink-700'}>{d.note ? `${d.note} · ${formatFcfa(d.balance)}` : formatMonth(d.dueMonth)}</span>
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

      <InscriptionBlock key={`insc-${member.id}`} member={member} canCollect={hasRole(me, ['SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN'])} />

      {member.hasAccount === false
        ? isAdmin && <CreateAccess key={member.id} member={member} />
        : hasRole(me, ['PRESIDENT_ADMIN']) && <ResetPassword key={member.id} member={member} />}

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

/** Membre suivi sans compte qui s'inscrit enfin : on lui crée son accès, il garde tout son historique. */
function CreateAccess({ member }: { member: MemberSummary }) {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => api.post<{ username: string; temporaryPassword: string }>(`/members/${member.id}/account`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Accès créé ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'accès n'a pas pu être créé."),
  });
  const c = create.data;

  return (
    <div className="mt-6 border-t border-ink-300/30 pt-5">
      <p className="label">Compte dans l'appli</p>
      {c ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-mims-50 p-4">
            <p className="font-mono text-sm text-mims-800">Identifiant : <b>{c.username}</b></p>
            <p className="font-mono text-sm text-mims-800">Mot de passe : <b>{c.temporaryPassword}</b></p>
          </div>
          <InviteActions message={inviteMessage(member.firstName, c)} />
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-700">Pas encore inscrit. Crée-lui son accès quand il veut utiliser l'appli : il retrouvera ses cotisations et son historique.</p>
          <button className="btn-secondary !px-4 !py-2 text-xs" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Spinner />} Créer son accès
          </button>
        </>
      )}
    </div>
  );
}

/** Mot de passe oublié : un mot de passe provisoire, que le membre remplacera à sa prochaine connexion. */
function ResetPassword({ member }: { member: MemberSummary }) {
  const [confirming, setConfirming] = useState(false);
  const reset = useMutation({
    mutationFn: () => api.post<{ username: string; temporaryPassword: string }>(`/members/${member.id}/reset-password`),
    onSuccess: () => toast.success('Nouveau mot de passe créé ✅'),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le mot de passe n'a pas pu être changé."),
  });
  const c = reset.data;

  return (
    <div className="mt-6 border-t border-ink-300/30 pt-5">
      <p className="label">Mot de passe</p>
      {c ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-mims-50 p-4">
            <p className="font-mono text-sm text-mims-800">Identifiant : <b>{c.username}</b></p>
            <p className="font-mono text-sm text-mims-800">Mot de passe : <b>{c.temporaryPassword}</b></p>
            <p className="mt-2 text-xs text-ink-500">Il choisira son propre mot de passe à sa prochaine connexion.</p>
          </div>
          <InviteActions
            message={[
              `${member.firstName}, voici tes nouveaux identifiants Jeunes MIMS :`,
              `Identifiant : ${c.username}`,
              `Mot de passe provisoire : ${c.temporaryPassword}`,
              'Tu choisiras ton propre mot de passe à la connexion.',
            ].join('\n')}
          />
        </div>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="w-full text-sm text-ink-700">L'ancien mot de passe ne marchera plus. Continuer ?</p>
          <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => reset.mutate()} disabled={reset.isPending}>
            {reset.isPending && <Spinner />} Oui, réinitialiser
          </button>
          <button className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setConfirming(false)}>Annuler</button>
        </div>
      ) : (
        <button className="btn-secondary !px-4 !py-2 text-xs" onClick={() => setConfirming(true)}>
          Réinitialiser le mot de passe
        </button>
      )}
    </div>
  );
}

/** Inscription pas encore payée : on l'encaisse depuis la fiche (Secrétaire, Trésorier, Président). */
function InscriptionBlock({ member, canCollect }: { member: MemberSummary; canCollect: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(REGISTRATION_FEE));
  const [method, setMethod] = useState('CASH');
  const [paid, setPaid] = useState<number | null>(member.inscriptionPaid ?? null);
  const value = Math.floor(Number(amount)) || 0;

  const pay = useMutation({
    mutationFn: () => api.post('/payments', { memberId: member.id, amount: value, method, nature: 'INSCRIPTION' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      setPaid(value);
      setOpen(false);
      toast.success(`✅ ${formatFcfa(value)} enregistrés en caisse, reçu envoyé à ${member.firstName}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le paiement n'a pas été enregistré. Réessaie."),
  });

  return (
    <div className="mt-5 rounded-2xl bg-mist-200/70 p-4">
      <p className="label !mb-1">Inscription</p>
      {paid != null ? (
        <p className="text-sm font-semibold text-emerald-700">✅ Payée ({formatFcfa(paid)})</p>
      ) : !open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-amber-700">⏳ Pas encore payée</p>
          {canCollect && (
            <button className="btn-primary !px-4 !py-2 text-sm" onClick={() => setOpen(true)}>Enregistrer le paiement</button>
          )}
        </div>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            pay.mutate();
          }}
        >
          <div>
            <label className="label" htmlFor="insc-amount">Montant versé (F)</label>
            <input id="insc-amount" className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} required />
          </div>
          <div>
            <label className="label" htmlFor="insc-method">Payé en</label>
            <select id="insc-method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={pay.isPending || value < 1}>{pay.isPending && <Spinner />} Enregistrer</button>
          </div>
        </form>
      )}
    </div>
  );
}
