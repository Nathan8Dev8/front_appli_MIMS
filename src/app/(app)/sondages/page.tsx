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
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PollIcon, XIcon } from '@/components/ui/icons';
import type { Poll } from '@/lib/types';

export default function SondagesPage() {
  const { data: me } = useMe();
  const canCreate = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR']);
  const queryClient = useQueryClient();
  const canClose = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN']);
  const [createOpen, setCreateOpen] = useState(false);
  const [closing, setClosing] = useState<Poll | null>(null);

  const { data: polls, isLoading } = useQuery({ queryKey: ['polls'], queryFn: () => api.get<Poll[]>('/polls') });

  const vote = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string; changed: boolean }) => api.post(`/polls/${pollId}/votes`, { optionId }),
    onSuccess: (_, { changed }) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.success(changed ? 'Vote modifié ✅' : 'Vote enregistré ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ton vote n'a pas pu être enregistré."),
  });

  const close = useMutation({
    mutationFn: (pollId: string) => api.post(`/polls/${pollId}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.success('Sondage clôturé ✅');
      setClosing(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le sondage n'a pas pu être clôturé."),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Ta voix compte"
        title="Sondages"
        description="Ton avis aide le bureau à décider."
        actions={
          canCreate && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Nouveau sondage
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !polls?.length ? (
        <EmptyState icon={<PollIcon />} title="Pas de sondage en cours" description="Quand le bureau lance un sondage, tu pourras voter ici." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {polls.map((poll) => {
            const total = poll.options.reduce((s, o) => s + (o._count?.votes ?? 0), 0);
            return (
              <div key={poll.id} className="card animate-fade-up p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-ink-900">{poll.title}</h3>
                  <Badge variant={poll.status === 'OUVERT' ? 'success' : 'neutral'}>{poll.status === 'OUVERT' ? 'Ouvert' : 'Clôturé'}</Badge>
                </div>
                {poll.description && <p className="mb-4 text-sm text-ink-500">{poll.description}</p>}

                <div className="space-y-2.5">
                  {poll.options.map((option) => {
                    const votes = option._count?.votes ?? 0;
                    const pct = total ? Math.round((votes / total) * 100) : 0;
                    const mine = poll.myOptionId === option.id;
                    return (
                      <button
                        key={option.id}
                        disabled={poll.status !== 'OUVERT' || vote.isPending || mine}
                        aria-pressed={mine}
                        onClick={() => vote.mutate({ pollId: poll.id, optionId: option.id, changed: !!poll.myOptionId })}
                        className={`group relative block w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition hover:border-mims-400 disabled:cursor-default ${
                          mine ? 'border-mims-700 ring-1 ring-mims-700' : 'border-ink-300/40'
                        }`}
                      >
                        <div className={`absolute inset-y-0 left-0 transition-all ${mine ? 'bg-mims-100' : 'bg-mims-50'}`} style={{ width: `${pct}%` }} />
                        <div className="relative flex items-center justify-between gap-2 font-medium text-ink-900">
                          <span>{mine && '✅ '}{option.label}</span>
                          <span className="shrink-0 text-xs text-ink-500">{pct}% · {votes}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-ink-500">
                    {total} vote{total > 1 ? 's' : ''}
                    {poll.anonymous ? ' · anonyme' : ''}
                    {poll.myOptionId && poll.status === 'OUVERT' && ' · touche un autre choix pour changer ton vote'}
                  </p>
                  {canClose && poll.status === 'OUVERT' && (
                    <button className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => setClosing(poll)}>
                      Clôturer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreatePollModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={!!closing} onClose={() => setClosing(null)} title="Clôturer ce sondage ?" description="Plus personne ne pourra voter. Les résultats restent visibles.">
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-ghost" onClick={() => setClosing(null)}>Annuler</button>
          <button className="btn-primary" disabled={close.isPending} onClick={() => closing && close.mutate(closing.id)}>
            {close.isPending && <Spinner />}
            Clôturer
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CreatePollModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);

  const create = useMutation({
    mutationFn: () => api.post('/polls', { title, description: description || undefined, options: options.filter(Boolean) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.success('Sondage publié ✅');
      handleClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le sondage n'a pas pu être créé."),
  });

  function handleClose() {
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Créer un sondage">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <label className="label">Question</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Description (optionnel)</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  value={opt}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => setOptions(options.map((o, idx) => (idx === i ? e.target.value : o)))}
                  required
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-500 hover:bg-mist-200">
                    <XIcon width={16} height={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 text-xs font-semibold text-mims-700" onClick={() => setOptions([...options, ''])}>
            + Ajouter une option
          </button>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Publier
          </button>
        </div>
      </form>
    </Modal>
  );
}
