'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { BrandPanel } from '@/components/brand/brand-panel';
import { Spinner } from '@/components/ui/spinner';
import { ShieldIcon } from '@/components/ui/icons';

export default function NouveauMotDePassePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !token) router.replace('/connexion');
  }, [hydrated, token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Ton mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      clearMustChangePassword();
      toast.success('Mot de passe changé, tu peux y aller ✅');
      // Première connexion : on enchaîne sur l'écran de bienvenue (profil, notifications, règlement).
      router.replace('/bienvenue');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Le mot de passe n'a pas pu être changé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-mims-50 text-mims-700">
            <ShieldIcon />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-mims-900">
            Choisis ton mot de passe
          </h1>
          <p className="mt-2 text-sm text-ink-700">
            C'est ta première connexion. Remplace le mot de passe temporaire par un mot de passe à toi, que personne d'autre ne connaît.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="current">Mot de passe temporaire</label>
              <input id="current" type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="new">Nouveau mot de passe</label>
              <input id="new" type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Répète le nouveau mot de passe</label>
              <input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </div>

            {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <Spinner />}
              Enregistrer et continuer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
