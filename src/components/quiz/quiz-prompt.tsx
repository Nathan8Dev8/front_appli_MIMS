'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { Modal } from '@/components/ui/modal';
import { formatDateTime } from '@/lib/format';
import { QUIZ_MANAGER_ROLES } from './score-badge';
import type { QuizSummary } from '@/lib/types';

// Une fois par ouverture de l'appli (sessionStorage est vidé quand on la ferme).
const SEEN_KEY = 'jeunes-mims-quiz-prompt';

/** À l'ouverture de l'appli, invite à participer au quiz en cours si le membre n'y a pas encore répondu. */
export function QuizPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);

  // Les responsables voient les réponses : ils ne participent pas, on ne les invite pas.
  const eligible = !!me && !hasRole(me, QUIZ_MANAGER_ROLES);
  const { data: quizzes } = useQuery({ queryKey: ['quizzes'], queryFn: () => api.get<QuizSummary[]>('/quizzes'), enabled: eligible });
  const pending = (quizzes ?? []).filter((q) => !q.closed && !q.myAttempt);

  useEffect(() => {
    // Pas pendant l'écran de bienvenue ni sur les pages quiz elles-mêmes.
    if (!pending.length || pathname === '/bienvenue' || pathname?.startsWith('/quiz')) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // stockage indisponible : on montre quand même l'invitation
    }
    setOpen(true);
  }, [pending.length, pathname]);

  const quiz = pending[0];
  if (!quiz) return null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="🧠 Le quiz de la semaine t'attend !">
      <div className="rounded-2xl bg-mims-gradient p-5 text-white">
        <p className="font-display text-lg font-semibold">{quiz.title}</p>
        <p className="mt-1 text-sm text-mims-100">
          {quiz.questionCount} question{quiz.questionCount > 1 ? 's' : ''}
          {quiz.closesAt && ` · jusqu'au ${formatDateTime(quiz.closesAt)}`}
        </p>
      </div>
      {quiz.comment && <p className="mt-3 whitespace-pre-line text-sm text-ink-700">💬 {quiz.comment}</p>}
      {pending.length > 1 && <p className="mt-3 text-sm text-ink-500">Et {pending.length - 1} autre quiz en cours.</p>}
      <p className="mt-3 text-sm text-ink-500">Un sans-faute à tous les quiz du mois est récompensé 🏆</p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="btn-ghost" onClick={() => setOpen(false)}>Plus tard</button>
        <button
          className="btn-primary"
          onClick={() => {
            setOpen(false);
            router.push(`/quiz/${quiz.id}`);
          }}
        >
          Participer maintenant
        </button>
      </div>
    </Modal>
  );
}
