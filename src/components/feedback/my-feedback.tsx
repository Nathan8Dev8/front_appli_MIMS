'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { FEEDBACK_STATUS, openFeedback } from './feedback';
import type { AppFeedback } from '@/lib/types';

/** Les bugs et idées envoyés par le membre, avec leur suivi et la réponse de l'administrateur. */
export function MyFeedback() {
  const { data } = useQuery({ queryKey: ['feedback', 'mine'], queryFn: () => api.get<AppFeedback[]>('/feedback/mine') });

  return (
    <div className="card mt-6 animate-fade-up p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">🐞 Mes signalements</h2>
          <p className="text-sm text-ink-500">Les bugs et idées que tu as envoyés pour améliorer l'appli.</p>
        </div>
        <button className="btn-secondary" onClick={openFeedback}>Signaler un bug ou une idée</button>
      </div>
      {!data?.length ? (
        <p className="text-sm text-ink-500">Rien d'envoyé pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-ink-300/30">
          {data.map((f) => (
            <li key={f.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={FEEDBACK_STATUS[f.status].variant}>{FEEDBACK_STATUS[f.status].label}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                  {f.kind === 'BUG' ? '🐞' : '✨'} {f.title}
                </span>
                <span className="text-xs text-ink-500">{formatDate(f.createdAt)}</span>
              </div>
              {f.adminNote && <p className="mt-1.5 rounded-xl bg-mims-50 px-3 py-2 text-sm text-mims-800">💬 {f.adminNote}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
