'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { BrandPanel } from '@/components/brand/brand-panel';
import { Spinner } from '@/components/ui/spinner';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';

interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
  member: { id: string; firstName: string; lastName: string; avatarUrl: string | null; roles: string[] };
}

export default function ConnexionPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { username, password });
      login(res.accessToken, res.member, res.mustChangePassword);
      toast.success(`Salut ${res.member.firstName} 👋`);
      router.replace(res.mustChangePassword ? '/connexion/nouveau-mot-de-passe' : '/tableau-de-bord');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible pour l'instant, réessaie dans un moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-mims-100">
              <Image src="/logo.png" alt="Jeunes MIMS" width={44} height={44} />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-mims-700">Espace membre</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-mims-900">
            Content de te revoir
          </h1>
          <p className="mt-2 text-sm text-ink-700">
            Entre l'identifiant que le secrétariat t'a donné.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="username">Identifiant</label>
              <input
                id="username"
                className="input"
                placeholder="prenom.nom"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  className="input pr-11"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-500 hover:text-mims-700"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <Spinner />}
              Se connecter
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-500">
            Tu n'as pas encore d'accès ? Demande-le au secrétariat à la prochaine rencontre,
            <br />les comptes sont créés à la main.
          </p>
        </div>
      </div>
    </div>
  );
}
