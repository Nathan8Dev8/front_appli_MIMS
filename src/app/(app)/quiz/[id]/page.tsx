'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { FullPageSpinner, Spinner } from '@/components/ui/spinner';
import { BrainIcon, CheckIcon, ChevronLeftIcon, XIcon } from '@/components/ui/icons';
import { QUIZ_MANAGER_ROLES, ScoreBadge } from '@/components/quiz/score-badge';
import { formatDate, formatDateTime } from '@/lib/format';
import type { QuizAnswer, QuizDetail, QuizQuestion, QuizResults } from '@/lib/types';

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: me } = useMe();
  const isManager = hasRole(me, QUIZ_MANAGER_ROLES);
  const { data: quiz, isLoading, error } = useQuery({ queryKey: ['quizzes', id], queryFn: () => api.get<QuizDetail>(`/quizzes/${id}`) });

  if (isLoading) return <FullPageSpinner />;
  if (!quiz) return <EmptyState icon={<BrainIcon />} title="Quiz introuvable" description={error instanceof ApiError ? error.message : undefined} />;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.back()} className="btn-ghost -ml-3 mb-4 !px-3">
        <ChevronLeftIcon width={18} height={18} /> Retour
      </button>

      <div className="card overflow-hidden">
        <div className="bg-mims-gradient px-5 py-6 text-white sm:px-7">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant={quiz.closed ? 'neutral' : 'success'} className={quiz.closed ? '!bg-white/15 !text-white' : ''}>
              {quiz.closed ? 'Terminé' : 'En cours'}
            </Badge>
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">🧠 {quiz.title}</h1>
          <p className="mt-2 text-sm text-mims-100">
            {quiz.questions.length} question{quiz.questions.length > 1 ? 's' : ''} · publié le {formatDate(quiz.publishedAt)}
            {quiz.closesAt && ` · ${quiz.closed ? 'terminé' : 'jusqu’au'} ${formatDateTime(quiz.closesAt)}`}
          </p>
        </div>
        {quiz.comment && (
          <div className="flex gap-3 p-5 sm:px-7">
            <span className="text-xl">💬</span>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{quiz.comment}</p>
          </div>
        )}
      </div>

      {isManager ? (
        <>
          <ManagerResults quiz={quiz} />
          <Correction title="📋 Questions et bonnes réponses" questions={quiz.questions} />
        </>
      ) : quiz.myAttempt ? (
        <MyResult quiz={quiz} />
      ) : quiz.closed ? (
        <>
          <p className="mt-4 rounded-2xl bg-mist-200 p-4 text-sm text-ink-700">Tu n'as pas participé à ce quiz. Voici la correction 👇</p>
          <Correction title="📋 Correction" questions={quiz.questions} />
        </>
      ) : (
        <TakeQuiz quiz={quiz} />
      )}
    </div>
  );
}

function TakeQuiz({ quiz }: { quiz: QuizDetail }) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});

  const submit = useMutation({
    mutationFn: () => api.post<{ score: number; total: number }>(`/quizzes/${quiz.id}/submit`, { answers }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success(res.score === res.total ? 'Sans faute, bravo 🎉' : `Envoyé : ${res.score}/${res.total} 👍`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Tes réponses n'ont pas pu être envoyées."),
  });

  const answered = (q: QuizQuestion) => {
    const a = answers[q.id];
    return q.type === 'TEXTE' ? typeof a === 'string' && !!a.trim() : Array.isArray(a) && a.length > 0;
  };
  const remaining = quiz.questions.filter((q) => !answered(q)).length;

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      {quiz.questions.map((q, idx) => (
        <fieldset key={q.id} className="card p-5 sm:p-6">
          <legend className="sr-only">Question {idx + 1}</legend>
          <p className="mb-3 font-semibold text-ink-900">
            <span className="text-mims-600">{idx + 1}.</span> {q.question}
          </p>
          {q.type === 'TEXTE' ? (
            <input
              className="input"
              placeholder="Ta réponse"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              aria-label={`Réponse à la question ${idx + 1}`}
            />
          ) : (
            <>
              <p className="mb-2 text-xs text-ink-500">Coche la ou les bonnes réponses.</p>
              <div className="grid gap-2">
                {q.choices?.map((choice, cIdx) => {
                  const picked = Array.isArray(answers[q.id]) && (answers[q.id] as number[]).includes(cIdx);
                  return (
                    <label
                      key={cIdx}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        picked ? 'border-mims-700 bg-mims-50 font-semibold text-mims-800' : 'border-ink-300/50 hover:border-mims-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 rounded border-ink-300 text-mims-700 focus:ring-mims-500"
                        checked={picked}
                        onChange={() => {
                          const current = (answers[q.id] as number[] | undefined) ?? [];
                          setAnswers({ ...answers, [q.id]: picked ? current.filter((x) => x !== cIdx) : [...current, cIdx] });
                        }}
                      />
                      {choice}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </fieldset>
      ))}

      <div className="sticky bottom-20 lg:bottom-4">
        <button type="submit" className="btn-primary w-full !py-3.5 shadow-lift" disabled={remaining > 0 || submit.isPending}>
          {submit.isPending && <Spinner />}
          {remaining > 0 ? `Encore ${remaining} question${remaining > 1 ? 's' : ''}` : 'Envoyer mes réponses'}
        </button>
        <p className="mt-2 text-center text-xs text-ink-500">Une seule participation : vérifie bien avant d'envoyer.</p>
      </div>
    </form>
  );
}

function MyResult({ quiz }: { quiz: QuizDetail }) {
  const attempt = quiz.myAttempt!;
  const perfect = attempt.score === attempt.total;
  return (
    <>
      <div className="card mt-4 p-6 text-center">
        <p className="text-sm font-semibold text-ink-500">Ton score</p>
        <p className="mt-1 font-display text-5xl font-semibold text-mims-700">
          {attempt.score}/{attempt.total}
        </p>
        <p className="mt-2 text-sm text-ink-700">{perfect ? 'Sans faute, bravo 🎉' : 'Merci pour ta participation 🙏'}</p>
        {!quiz.closed && quiz.closesAt && (
          <p className="mt-3 text-xs text-ink-500">La correction sera visible à la fin du quiz, le {formatDateTime(quiz.closesAt)}.</p>
        )}
      </div>
      {quiz.closed && <Correction title="📋 Ta correction" questions={quiz.questions} answers={attempt.answers} results={attempt.results} />}
    </>
  );
}

/** Affiche une réponse donnée (cases cochées ou texte). */
function answerText(q: QuizQuestion, a?: QuizAnswer) {
  if (q.type === 'TEXTE') return typeof a === 'string' && a.trim() ? a : '—';
  return Array.isArray(a) && a.length ? a.map((i) => q.choices?.[i]).join(', ') : '—';
}

function Correction({
  title,
  questions,
  answers,
  results,
}: {
  title: string;
  questions: QuizQuestion[];
  answers?: Record<string, QuizAnswer>;
  results?: Record<string, boolean>;
}) {
  return (
    <section className="card mt-4 p-5 sm:p-6">
      <h2 className="mb-4 font-display text-base font-semibold text-ink-900">{title}</h2>
      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const ok = results?.[q.id];
          return (
            <li key={q.id} className="border-b border-ink-300/30 pb-4 last:border-0 last:pb-0">
              <p className="font-semibold text-ink-900">
                {results && (ok ? '✅ ' : '❌ ')}
                {idx + 1}. {q.question}
              </p>
              {answers && <p className="mt-1 text-sm text-ink-700">Ta réponse : {answerText(q, answers[q.id])}</p>}
              <p className="mt-1 text-sm font-medium text-emerald-700">
                Bonne réponse : {q.type === 'TEXTE' ? q.answer : q.correctIndexes?.map((i) => q.choices?.[i]).join(', ')}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Résultats de chaque participant, avec ses réponses ; un responsable peut corriger une réponse à la main. */
function ManagerResults({ quiz }: { quiz: QuizDetail }) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['quizzes', quiz.id, 'results'], queryFn: () => api.get<QuizResults>(`/quizzes/${quiz.id}/results`) });

  const correct = useMutation({
    mutationFn: (v: { attemptId: string; questionId: string; correct: boolean }) =>
      api.patch(`/quizzes/${quiz.id}/attempts/${v.attemptId}`, { questionId: v.questionId, correct: v.correct }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Correction enregistrée, score recalculé ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La correction n'a pas pu être enregistrée."),
  });

  if (isLoading || !data) return <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-mims-700" /></div>;

  const perfect = data.attempts.filter((a) => a.score === a.total).length;
  const average = data.attempts.length ? data.attempts.reduce((s, a) => s + a.score / a.total, 0) / data.attempts.length : 0;

  return (
    <section className="card mt-4 p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold text-ink-900">👥 Résultats des participants</h2>
      <p className="mb-4 text-sm text-ink-500">
        {data.attempts.length} participant{data.attempts.length > 1 ? 's' : ''}
        {data.attempts.length > 0 && ` · moyenne ${Math.round(average * 100)} % · ${perfect} sans-faute`}
      </p>

      {!data.attempts.length ? (
        <p className="text-sm text-ink-500">Personne n'a encore répondu.</p>
      ) : (
        <ul className="divide-y divide-ink-300/30">
          {data.attempts.map((a) => {
            const open = openId === a.id;
            return (
              <li key={a.id} className="py-2">
                <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-mist-200" onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open}>
                  <Avatar firstName={a.member.firstName} lastName={a.member.lastName} avatarUrl={a.member.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-900">{a.member.firstName} {a.member.lastName}</span>
                    <span className="text-xs text-ink-500">{formatDateTime(a.submittedAt)}</span>
                  </span>
                  <ScoreBadge score={a.score} total={a.total} />
                </button>

                {open && (
                  <ol className="mt-2 space-y-3 rounded-xl bg-mist-200/60 p-3 sm:p-4">
                    {data.questions.map((q, idx) => {
                      const ok = !!a.results[q.id];
                      return (
                        <li key={q.id} className="text-sm">
                          <p className="font-semibold text-ink-900">{idx + 1}. {q.question}</p>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <span className={ok ? 'text-emerald-700' : 'text-rose-700'}>
                              {ok ? '✅' : '❌'} {answerText(q, a.answers[q.id])}
                            </span>
                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-ink-300/60 hover:ring-mims-300"
                              disabled={correct.isPending}
                              onClick={() => correct.mutate({ attemptId: a.id, questionId: q.id, correct: !ok })}
                            >
                              {ok ? <XIcon width={12} height={12} /> : <CheckIcon width={12} height={12} />}
                              {ok ? 'Compter faux' : 'Compter juste'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
