'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ArrowRightIcon, BrainIcon, ChevronRightIcon, PlusIcon } from '@/components/ui/icons';
import { CreateQuizModal } from '@/components/quiz/create-quiz-modal';
import { QUIZ_MANAGER_ROLES, ScoreBadge } from '@/components/quiz/score-badge';
import { formatDate, formatMonth } from '@/lib/format';
import type { QuizRewards, QuizSummary } from '@/lib/types';

/** Lundi 00:00 de la semaine en cours (heure du téléphone). */
function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const monthParam = (offset: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function QuizPage() {
  const { data: me } = useMe();
  const isManager = hasRole(me, QUIZ_MANAGER_ROLES);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: quizzes, isLoading } = useQuery({ queryKey: ['quizzes'], queryFn: () => api.get<QuizSummary[]>('/quizzes') });

  const toDo = (quizzes ?? []).filter((q) => !q.closed && !q.myAttempt && !isManager);
  const thisWeek = (quizzes ?? []).some((q) => new Date(q.publishedAt) >= startOfWeek());

  // Historique groupé par mois de publication.
  const byMonth = new Map<string, QuizSummary[]>();
  for (const q of quizzes ?? []) {
    const key = formatMonth(q.publishedAt);
    byMonth.set(key, [...(byMonth.get(key) ?? []), q]);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Grandir ensemble"
        title="Quiz"
        description="Un quiz par semaine sur la Bible et la vie du groupe. Un sans-faute tout le mois est récompensé 🏆"
        actions={
          isManager && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Nouveau quiz
            </button>
          )
        }
      />

      {isManager && !isLoading && !thisWeek && (
        <button
          onClick={() => setCreateOpen(true)}
          className="mb-6 flex w-full items-center gap-4 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200 transition hover:shadow-hover sm:p-5"
        >
          <span className="text-2xl">⏰</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink-900">Pas encore de quiz cette semaine</span>
            <span className="block text-sm text-ink-700">Le quiz est hebdomadaire : prépare celui de cette semaine.</span>
          </span>
          <ArrowRightIcon width={18} height={18} className="shrink-0 text-ink-700" />
        </button>
      )}

      {isManager && <RewardsPanel />}

      {toDo.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">✍️ À faire</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {toDo.map((q) => (
              <Link key={q.id} href={`/quiz/${q.id}`} className="animate-fade-up rounded-2xl bg-mims-gradient p-5 text-white shadow-card transition hover:shadow-hover">
                <p className="text-xs font-semibold uppercase tracking-wide text-mims-100">
                  {q.questionCount} question{q.questionCount > 1 ? 's' : ''}
                  {q.closesAt && ` · jusqu'au ${formatDate(q.closesAt, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                </p>
                <p className="mt-1 font-display text-lg font-semibold">{q.title}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-mims-800">
                  Commencer <ArrowRightIcon width={16} height={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !quizzes?.length ? (
        <EmptyState icon={<BrainIcon />} title="Pas encore de quiz" description="Le quiz de la semaine s'affichera ici." />
      ) : (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">🕰️ Historique</h2>
          <div className="space-y-6">
            {[...byMonth.entries()].map(([month, list]) => {
              const done = list.filter((q) => q.myAttempt);
              const score = done.reduce((s, q) => s + q.myAttempt!.score, 0);
              const total = done.reduce((s, q) => s + q.myAttempt!.total, 0);
              return (
                <div key={month}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-mims-600">{month}</h3>
                    {!isManager && done.length > 0 && (
                      <span className="text-xs font-semibold text-ink-500">
                        {done.length}/{list.length} quiz · {score}/{total}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {list.map((q) => (
                      <li key={q.id}>
                        <Link href={`/quiz/${q.id}`} className="card flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:shadow-hover sm:p-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-500">
                            <BrainIcon width={20} height={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-ink-900">{q.title}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                              {formatDate(q.publishedAt)}
                              <Badge variant={q.closed ? 'neutral' : 'success'}>{q.closed ? 'Terminé' : 'En cours'}</Badge>
                              {isManager && <Badge variant="info">{q.participants ?? 0} participant{(q.participants ?? 0) > 1 ? 's' : ''}</Badge>}
                            </span>
                          </span>
                          {!isManager &&
                            (q.myAttempt ? (
                              <ScoreBadge score={q.myAttempt.score} total={q.myAttempt.total} />
                            ) : (
                              <Badge variant={q.closed ? 'neutral' : 'warning'}>{q.closed ? 'Pas fait' : 'À faire'}</Badge>
                            ))}
                          <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isManager && <CreateQuizModal open={createOpen} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

/** Sans-faute du mois dernier (à récompenser) et du mois en cours (en bonne voie). */
function RewardsPanel() {
  const { data: last } = useQuery({ queryKey: ['quizzes', 'rewards', monthParam(-1)], queryFn: () => api.get<QuizRewards>(`/quizzes/rewards?month=${monthParam(-1)}`) });
  const { data: current } = useQuery({ queryKey: ['quizzes', 'rewards', monthParam(0)], queryFn: () => api.get<QuizRewards>(`/quizzes/rewards?month=${monthParam(0)}`) });

  const block = (title: string, hint: string, data?: QuizRewards) => (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mb-2 text-xs text-ink-500">{data ? `${data.quizCount} quiz · ${hint}` : '…'}</p>
      {data && !data.winners.length ? (
        <p className="text-sm text-ink-500">Personne pour l'instant.</p>
      ) : (
        <ul className="space-y-1.5">
          {data?.winners.map((w) => (
            <li key={w.memberId} className="flex items-center gap-2 text-sm">
              <Avatar firstName={w.member.firstName} lastName={w.member.lastName} avatarUrl={w.member.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{w.member.firstName} {w.member.lastName}</span>
              <ScoreBadge score={w.score} total={w.total} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="mb-8 rounded-2xl bg-gold-100/60 p-4 ring-1 ring-gold-300 sm:p-5">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">🏆 Sans-faute du mois</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {block(`À récompenser · ${formatMonth(`${monthParam(-1)}-01`)}`, 'note maximale à tous les quiz', last)}
        {block(`En bonne voie · ${formatMonth(`${monthParam(0)}-01`)}`, "sans faute jusqu'ici", current)}
      </div>
    </section>
  );
}
