'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { useMe } from '@/hooks/use-me';
import { useOnboarding } from '@/hooks/use-onboarding';
import { FullPageSpinner, Spinner } from '@/components/ui/spinner';
import { CheckIcon, DownloadIcon } from '@/components/ui/icons';
import { PushSettings } from '@/components/notifications/push-settings';
import { BirthDateForm } from '@/components/profile/birth-date-form';

/** Première connexion : 3 petites étapes, puis on entre dans l'appli. */
export default function BienvenuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: onboarding, isLoading } = useOnboarding();
  const [readRegulation, setReadRegulation] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const complete = useMutation({
    mutationFn: () => api.post('/onboarding/me/complete'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success('Bienvenue dans le groupe 🎉');
      router.replace('/tableau-de-bord');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas pu être enregistré."),
  });

  if (isLoading || !onboarding || !me) return <FullPageSpinner />;

  const done = onboarding.status === 'TERMINE';
  const profileOk = !!me.birthDate;
  const regulation = onboarding.regulation;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 animate-fade-up rounded-3xl bg-mims-gradient p-6 text-white shadow-card sm:p-8">
        <p className="text-sm font-semibold text-mims-100">Bienvenue chez les Jeunes MIMS 👋</p>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Content de t'avoir avec nous, {me.firstName} !</h1>
        <p className="mt-2 text-sm text-mims-100/90">
          {done ? 'Ton inscription est terminée. Tu peux revoir ces étapes quand tu veux.' : 'Trois petites étapes, deux minutes, et tu es prêt.'}
        </p>
      </div>

      <ol className="space-y-4">
        <Step n={1} title="Ta date de naissance" done={profileOk}>
          <p className="mb-3 text-sm text-ink-500">
            Obligatoire : c'est ce jour-là que tout le groupe te souhaitera ton anniversaire 🎂
          </p>
          <BirthDateForm initial={me.birthDate} />
          <Link href="/mon-profil" className="mt-3 inline-block text-xs font-semibold text-mims-700">
            Compléter le reste de mon profil (photo, adresse…)
          </Link>
        </Step>

        <Step n={2} title="Active les notifications" hint="Pour être prévenu des assises, des annonces et de tes reçus, même appli fermée.">
          <PushSettings compact />
        </Step>

        <Step n={3} title="Lis le règlement intérieur" done={done}>
          {regulation ? (
            <>
              <button
                className="btn-secondary"
                onClick={() =>
                  downloadFile(`/documents/${regulation.id}/download`)
                    .then(() => setReadRegulation(true))
                    .catch((e) => toast.error(e instanceof ApiError ? e.message : "Le téléchargement n'a pas marché."))
                }
              >
                <DownloadIcon width={16} height={16} /> Ouvrir « {regulation.title} »
              </button>
              {!done && (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-mist-200 p-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 text-mims-700 focus:ring-mims-500"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span className="text-sm text-ink-700">J'ai lu le règlement intérieur et je m'engage à le respecter.</span>
                </label>
              )}
              {!done && !readRegulation && !accepted && <p className="mt-2 text-xs text-ink-500">Ouvre-le avant de cocher la case.</p>}
            </>
          ) : (
            <p className="text-sm text-ink-500">Le bureau n'a pas encore publié le règlement. Tu le trouveras dans Documents dès qu'il sera en ligne.</p>
          )}
        </Step>
      </ol>

      <div className="sticky bottom-20 mt-6 lg:bottom-4">
        {done ? (
          <Link href="/tableau-de-bord" className="btn-primary w-full !py-3.5">C'est parti</Link>
        ) : (
          <button
            className="btn-primary w-full !py-3.5 shadow-lift"
            disabled={!profileOk || (!!regulation && !accepted) || complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending && <Spinner />}
            Terminer mon inscription
          </button>
        )}
        {!done && !profileOk && <p className="mt-2 text-center text-xs text-ink-500">Ajoute ta date de naissance pour terminer.</p>}
      </div>
    </div>
  );
}

function Step({ n, title, hint, done, children }: { n: number; title: string; hint?: string; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="card animate-fade-up p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            done ? 'bg-emerald-600 text-white' : 'bg-mims-50 text-mims-700'
          }`}
        >
          {done ? <CheckIcon width={16} height={16} /> : n}
        </span>
        <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
      </div>
      {hint && <p className="mb-3 text-sm text-ink-500">{hint}</p>}
      {children}
    </li>
  );
}
