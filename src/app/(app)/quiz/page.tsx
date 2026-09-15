'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { BrainIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import type { Quiz } from '@/lib/types';

export default function QuizPage() {
  const { data: me } = useMe();
  const canCreate = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR']);
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<Quiz | null>(null);

  const { data: quizzes, isLoading } = useQuery({ queryKey: ['quizzes'], queryFn: () => api.get<Quiz[]>('/quizzes') });

  return (
    <div>
      <PageHeader
        eyebrow="Grandir ensemble"
        title="Quiz"
        description="Approfondis ta connaissance biblique et de la vie du groupe, un défi à la fois."
        actions={
          canCreate && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Nouveau quiz
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !quizzes?.length ? (
        <EmptyState icon={<BrainIcon />} title="Aucun quiz disponible pour le moment" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <button key={quiz.id} onClick={() => setActive(quiz)} className="card animate-fade-up flex items-center gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-hover">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-500">
                <BrainIcon width={20} height={20} />
              </div>
              <div>
                <p className="font-semibold text-ink-900">{quiz.title}</p>
                <p className="text-xs text-ink-500">{quiz.content.questions.length} question(s)</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <TakeQuizModal quiz={active} onClose={() => setActive(null)} />
      <CreateQuizModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function TakeQuizModal({ quiz, onClose }: { quiz: Quiz | null; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const submit = useMutation({
    mutationFn: () => api.post<{ score: number; total: number }>(`/quizzes/${quiz!.id}/submit`, { answers }),
    onSuccess: (res) => setResult(res),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Envoi impossible.'),
  });

  function handleClose() {
    setAnswers({});
    setResult(null);
    onClose();
  }

  if (!quiz) return null;

  return (
    <Modal open={!!quiz} onClose={handleClose} title={quiz.title} maxWidth="max-w-xl">
      {result ? (
        <div className="py-4 text-center">
          <p className="font-display text-4xl font-semibold text-mims-700">{result.score}/{result.total}</p>
          <p className="mt-2 text-sm text-ink-500">
            {result.score === result.total ? 'Score parfait, bravo !' : 'Merci pour ta participation !'}
          </p>
          <button className="btn-primary mt-6" onClick={handleClose}>Fermer</button>
        </div>
      ) : (
        <div className="space-y-5">
          {quiz.content.questions.map((q, idx) => (
            <div key={q.id}>
              <p className="mb-2 text-sm font-semibold text-ink-900">{idx + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.choices.map((choice, choiceIdx) => (
                  <button
                    key={choiceIdx}
                    onClick={() => setAnswers({ ...answers, [q.id]: choiceIdx })}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                      answers[q.id] === choiceIdx ? 'border-mims-700 bg-mims-50 font-semibold text-mims-800' : 'border-ink-300/40 hover:border-mims-300'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className="btn-primary w-full"
            disabled={Object.keys(answers).length < quiz.content.questions.length || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending && <Spinner />}
            Valider mes réponses
          </button>
        </div>
      )}
    </Modal>
  );
}

function CreateQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ id: crypto.randomUUID(), question: '', choices: ['', ''], correctIndex: 0 }]);

  const create = useMutation({
    mutationFn: () => api.post('/quizzes', { title, questions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz publié.');
      handleClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Création impossible.'),
  });

  function handleClose() {
    setTitle('');
    setQuestions([{ id: crypto.randomUUID(), question: '', choices: ['', ''], correctIndex: 0 }]);
    onClose();
  }

  function updateQuestion(id: string, patch: Partial<(typeof questions)[number]>) {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  return (
    <Modal open={open} onClose={handleClose} title="Créer un quiz" maxWidth="max-w-xl">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <label className="label">Titre du quiz</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {questions.map((q, qIdx) => (
          <div key={q.id} className="rounded-xl border border-ink-300/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="label !mb-0">Question {qIdx + 1}</label>
              {questions.length > 1 && (
                <button type="button" onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))} className="text-ink-500 hover:text-rose-600">
                  <XIcon width={16} height={16} />
                </button>
              )}
            </div>
            <input className="input mb-3" value={q.question} onChange={(e) => updateQuestion(q.id, { question: e.target.value })} required />
            <div className="space-y-2">
              {q.choices.map((choice, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctIndex === cIdx}
                    onChange={() => updateQuestion(q.id, { correctIndex: cIdx })}
                    className="h-4 w-4 text-mims-700"
                  />
                  <input
                    className="input"
                    placeholder={`Choix ${cIdx + 1}`}
                    value={choice}
                    onChange={(e) => updateQuestion(q.id, { choices: q.choices.map((c, i) => (i === cIdx ? e.target.value : c)) })}
                    required
                  />
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-xs font-semibold text-mims-700" onClick={() => updateQuestion(q.id, { choices: [...q.choices, ''] })}>
              + Ajouter un choix
            </button>
          </div>
        ))}

        <button
          type="button"
          className="text-sm font-semibold text-mims-700"
          onClick={() => setQuestions([...questions, { id: crypto.randomUUID(), question: '', choices: ['', ''], correctIndex: 0 }])}
        >
          + Ajouter une question
        </button>

        <div className="flex justify-end gap-3 border-t border-ink-300/30 pt-4">
          <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Publier le quiz
          </button>
        </div>
      </form>
    </Modal>
  );
}
