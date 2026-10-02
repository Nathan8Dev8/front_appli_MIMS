'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { XIcon } from '@/components/ui/icons';
import { toLocalInput } from '@/lib/events';

type Draft = { id: string; type: 'CHOIX' | 'TEXTE'; question: string; choices: string[]; correctIndexes: number[]; answer: string };

const newQuestion = (): Draft => ({ id: crypto.randomUUID(), type: 'CHOIX', question: '', choices: ['', ''], correctIndexes: [], answer: '' });
const inSevenDays = () => toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());

/** Quiz de la semaine : questions à cases à cocher (une ou plusieurs bonnes réponses) ou à réponse écrite. */
export function CreateQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [closesAt, setClosesAt] = useState(inSevenDays());
  const [questions, setQuestions] = useState<Draft[]>([newQuestion()]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setComment('');
    setClosesAt(inSevenDays());
    setQuestions([newQuestion()]);
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/quizzes', {
        title,
        comment,
        closesAt: new Date(closesAt).toISOString(),
        questions: questions.map((q) =>
          q.type === 'TEXTE'
            ? { id: q.id, type: q.type, question: q.question, answer: q.answer }
            : { id: q.id, type: q.type, question: q.question, choices: q.choices, correctIndexes: q.correctIndexes },
        ),
      }),
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz publié, les jeunes sont prévenus 🧠');
      onClose();
      router.push(`/quiz/${quiz.id}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le quiz n'a pas pu être créé."),
  });

  const update = (id: string, patch: Partial<Draft>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const missingAnswer = questions.findIndex((q) => (q.type === 'CHOIX' ? !q.correctIndexes.length : !q.answer.trim()));

  return (
    <Modal open={open} onClose={onClose} title="Quiz de la semaine" maxWidth="max-w-2xl">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (missingAnswer >= 0) return toast.error(`Question ${missingAnswer + 1} : indique la bonne réponse.`);
          create.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="label" htmlFor="quiz-title">Titre</label>
            <input id="quiz-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Les paraboles de Jésus" required />
          </div>
          <div>
            <label className="label" htmlFor="quiz-end">Fin du quiz</label>
            <input id="quiz-end" type="datetime-local" className="input" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="quiz-comment">Petit mot pour les participants (optionnel)</label>
          <textarea
            id="quiz-comment"
            className="input min-h-20"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex. Relisez Luc 15 avant de commencer. Bonne chance à tous 🙏"
          />
        </div>

        <ol className="space-y-4">
          {questions.map((q, qIdx) => (
            <li key={q.id} className="rounded-2xl border border-ink-300/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="label !mb-0">Question {qIdx + 1}</span>
                <div className="flex items-center gap-1">
                  <div className="inline-flex rounded-full bg-mist-200 p-0.5 text-xs font-semibold">
                    {(['CHOIX', 'TEXTE'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update(q.id, { type: t })}
                        aria-pressed={q.type === t}
                        className={`rounded-full px-3 py-1.5 transition ${q.type === t ? 'bg-white text-mims-800 shadow-soft' : 'text-ink-500'}`}
                      >
                        {t === 'CHOIX' ? '☑️ Cases à cocher' : '✍️ Réponse écrite'}
                      </button>
                    ))}
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Supprimer la question ${qIdx + 1}`}
                    >
                      <XIcon width={16} height={16} />
                    </button>
                  )}
                </div>
              </div>

              <input
                className="input mb-3"
                value={q.question}
                onChange={(e) => update(q.id, { question: e.target.value })}
                placeholder="La question"
                aria-label={`Question ${qIdx + 1}`}
                required
              />

              {q.type === 'CHOIX' ? (
                <>
                  <p className="mb-2 text-xs text-ink-500">Coche la ou les bonnes réponses.</p>
                  <div className="space-y-2">
                    {q.choices.map((choice, cIdx) => {
                      const correct = q.correctIndexes.includes(cIdx);
                      return (
                        <div key={cIdx} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={correct}
                            onChange={() =>
                              update(q.id, { correctIndexes: correct ? q.correctIndexes.filter((x) => x !== cIdx) : [...q.correctIndexes, cIdx] })
                            }
                            className="h-5 w-5 shrink-0 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500"
                            aria-label={`Réponse ${cIdx + 1} correcte`}
                          />
                          <input
                            className={`input ${correct ? '!border-emerald-400' : ''}`}
                            placeholder={`Réponse ${cIdx + 1}`}
                            value={choice}
                            onChange={(e) => update(q.id, { choices: q.choices.map((c, i) => (i === cIdx ? e.target.value : c)) })}
                            required
                          />
                          {q.choices.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                update(q.id, {
                                  choices: q.choices.filter((_, i) => i !== cIdx),
                                  correctIndexes: q.correctIndexes.filter((x) => x !== cIdx).map((x) => (x > cIdx ? x - 1 : x)),
                                })
                              }
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-mist-200"
                              aria-label={`Retirer la réponse ${cIdx + 1}`}
                            >
                              <XIcon width={14} height={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" className="mt-2 text-xs font-semibold text-mims-700" onClick={() => update(q.id, { choices: [...q.choices, ''] })}>
                    + Ajouter une réponse
                  </button>
                </>
              ) : (
                <div>
                  <input
                    className="input"
                    value={q.answer}
                    onChange={(e) => update(q.id, { answer: e.target.value })}
                    placeholder="Réponse attendue (ex. Moïse)"
                    aria-label={`Réponse attendue à la question ${qIdx + 1}`}
                    required
                  />
                  <p className="mt-1.5 text-xs text-ink-500">Majuscules, accents et ponctuation ne comptent pas. Tu pourras aussi valider une réponse à la main.</p>
                </div>
              )}
            </li>
          ))}
        </ol>

        <button type="button" className="btn-secondary w-full" onClick={() => setQuestions((qs) => [...qs, newQuestion()])}>
          + Ajouter une question
        </button>

        <div className="flex flex-col-reverse gap-3 border-t border-ink-300/30 pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Publier le quiz ({questions.length} question{questions.length > 1 ? 's' : ''})
          </button>
        </div>
      </form>
    </Modal>
  );
}
