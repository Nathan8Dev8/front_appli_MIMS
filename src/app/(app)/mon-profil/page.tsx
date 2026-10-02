'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe } from '@/hooks/use-me';
import { useAuthStore } from '@/store/auth-store';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { CameraIcon, ShieldIcon, SparkleIcon } from '@/components/ui/icons';
import { ROLE_LABELS } from '@/store/auth-store';
import { formatDate } from '@/lib/format';
import type { Me } from '@/hooks/use-me';
import { PushSettings } from '@/components/notifications/push-settings';
import { MyFeedback } from '@/components/feedback/my-feedback';

export default function MonProfilPage() {
  const { data: me, isLoading } = useMe();
  const queryClient = useQueryClient();
  const updateMember = useAuthStore((s) => s.updateMember);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [form, setForm] = useState<Partial<Me> | null>(null);
  const current = form ?? me ?? null;

  // Les endpoints /members/me et /members/me/avatar renvoient le membre "brut"
  // (sans la liste des rôles, propre à /auth/me) : on fusionne donc sur le cache
  // existant au lieu de l'écraser, pour ne jamais perdre `roles` en route.
  function mergeIntoMeCache(partial: Partial<Me>) {
    queryClient.setQueryData<Me>(['auth', 'me'], (old) => (old ? { ...old, ...partial } : (partial as Me)));
  }

  const saveProfile = useMutation({
    mutationFn: (payload: Partial<Me>) => api.patch<Me>('/members/me', payload),
    onSuccess: (updated) => {
      mergeIntoMeCache(updated);
      updateMember({ firstName: updated.firstName, lastName: updated.lastName });
      toast.success('Profil mis à jour ✅');
      setForm(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La mise à jour n'a pas marché."),
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updated = await api.post<Me>('/members/me/avatar', formData);
      mergeIntoMeCache(updated);
      updateMember({ avatarUrl: updated.avatarUrl });
      toast.success('Nouvelle photo enregistrée ✅');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "La photo n'a pas pu être envoyée.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function field<K extends keyof Me>(key: K, value: Me[K]) {
    setForm((prev) => ({ ...(prev ?? me ?? {}), [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    saveProfile.mutate({
      firstName: current.firstName,
      lastName: current.lastName,
      phone: current.phone,
      email: current.email || undefined,
      address: current.address || undefined,
      birthDate: current.birthDate ? current.birthDate.slice(0, 10) : undefined,
    });
  }

  if (isLoading || !me) {
    return (
      <div className="flex justify-center py-24 text-mims-700">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ton espace"
        title="Mon profil"
        description="Garde tes infos à jour pour qu'on puisse te joindre, et choisis la photo que tu veux."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Carte identité + photo */}
        <div className="card animate-fade-up flex flex-col items-center p-8 text-center lg:col-span-1">
          <div className="group relative">
            <Avatar firstName={me.firstName} lastName={me.lastName} avatarUrl={me.avatarUrl} size="xl" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-mims-700 text-white shadow-lift ring-4 ring-white transition hover:bg-mims-800 disabled:opacity-60"
              aria-label="Changer la photo de profil"
            >
              {avatarUploading ? <Spinner className="h-4 w-4" /> : <CameraIcon width={16} height={16} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-xs font-semibold text-mims-700 hover:text-mims-800"
          >
            Changer ma photo
          </button>
          <p className="mt-1 text-[11px] text-ink-500">JPEG, PNG ou WEBP · 10 Mo maximum</p>

          <h2 className="mt-4 font-display text-xl font-semibold text-ink-900">
            {me.firstName} {me.lastName}
          </h2>
          <p className="text-xs font-medium text-ink-500">Membre depuis le {formatDate(me.joinedAt)}</p>
          <p className="mt-1 text-xs text-ink-500">Code membre · {me.memberCode}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {me.roles.map((r) => (
              <span key={r} className="badge bg-mims-100 text-mims-700">{ROLE_LABELS[r] ?? r}</span>
            ))}
          </div>
        </div>

        {/* Formulaire informations personnelles */}
        <form onSubmit={handleSubmit} className="card animate-fade-up space-y-5 p-8 lg:col-span-2">
          <div className="flex items-center gap-2">
            <SparkleIcon width={18} height={18} className="text-mims-700" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Mes informations personnelles</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={current?.firstName ?? ''} onChange={(e) => field('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={current?.lastName ?? ''} onChange={(e) => field('lastName', e.target.value)} required />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input type="tel" className="input" value={current?.phone ?? ''} onChange={(e) => field('phone', e.target.value)} required />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={current?.email ?? ''} onChange={(e) => field('email', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input className="input" value={current?.address ?? ''} onChange={(e) => field('address', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="profile-birth">Date de naissance</label>
              <input
                id="profile-birth"
                type="date"
                className="input"
                max={new Date().toISOString().slice(0, 10)}
                value={current?.birthDate ? current.birthDate.slice(0, 10) : ''}
                onChange={(e) => field('birthDate', e.target.value as any)}
                required
              />
              <p className="mt-1.5 text-xs text-ink-500">Obligatoire : le groupe te souhaitera ton anniversaire ce jour-là 🎂</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-ink-300/30 pt-5">
            {form && (
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Spinner />}
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      <MyFeedback />

      <div className="card mt-6 animate-fade-up p-6 sm:p-8">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink-900">Notifications</h2>
        <p className="mb-4 text-sm text-ink-500">Les messages du groupe arrivent sur ton écran, même appli fermée. À activer sur chaque appareil que tu utilises.</p>
        <PushSettings />
      </div>

      <div className="mt-6">
        <SecurityCard />
      </div>
    </div>
  );
}

function SecurityCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Mot de passe changé ✅');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La mise à jour n'a pas marché."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error('Ton nouveau mot de passe doit faire au moins 8 caractères.');
    if (newPassword !== confirm) return toast.error('Les deux mots de passe ne sont pas identiques.');
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="card animate-fade-up p-8">
      <div className="mb-5 flex items-center gap-2">
        <ShieldIcon width={18} height={18} className="text-mims-700" />
        <h2 className="font-display text-lg font-semibold text-ink-900">Mot de passe</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label">Mot de passe actuel</label>
          <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <div>
          <label className="label">Confirmation</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" className="btn-secondary" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          Changer le mot de passe
        </button>
      </div>
    </form>
  );
}
