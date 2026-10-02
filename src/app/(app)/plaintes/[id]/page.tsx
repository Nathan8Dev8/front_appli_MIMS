'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { useMe } from '@/hooks/use-me';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { FullPageSpinner, Spinner } from '@/components/ui/spinner';
import { ChevronLeftIcon, DownloadIcon, InboxIcon } from '@/components/ui/icons';
import { CATEGORY_LABELS, KIND_LABELS, STATUS, isOpen } from '@/lib/complaints';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/store/auth-store';
import type { ComplaintDetail, ComplaintPerson, ComplaintStatus } from '@/lib/types';

const roleOf = (p: ComplaintPerson) => p.roles.map((r) => r.role.code).find((c) => c !== 'MEMBRE');

export default function PlainteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [reply, setReply] = useState('');
  const [closing, setClosing] = useState<ComplaintStatus | null>(null);

  const { data: c, isLoading, error } = useQuery({ queryKey: ['complaints', id], queryFn: () => api.get<ComplaintDetail>(`/complaints/${id}`) });

  const onSaved = (detail: ComplaintDetail) => {
    queryClient.setQueryData(['complaints', id], detail);
    queryClient.invalidateQueries({ queryKey: ['complaints'], exact: true });
  };

  const send = useMutation({
    mutationFn: () => api.post<ComplaintDetail>(`/complaints/${id}/messages`, { content: reply }),
    onSuccess: (detail) => {
      onSaved(detail);
      setReply('');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le message n'est pas parti."),
  });

  if (isLoading) return <FullPageSpinner />;
  if (!c) return <EmptyState icon={<InboxIcon />} title="Introuvable" description={error instanceof ApiError ? error.message : undefined} />;

  const open = isOpen(c.status);
  const mine = c.authorId === me?.id;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.back()} className="btn-ghost -ml-3 mb-4 !px-3">
        <ChevronLeftIcon width={18} height={18} /> Retour
      </button>

      <section className="card p-5 sm:p-7">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
          <span className="text-xs text-ink-500">{KIND_LABELS[c.kind]} · {CATEGORY_LABELS[c.category]} · {c.reference}</span>
        </div>
        <h1 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">{c.subject}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-500">
          <Avatar firstName={c.author.firstName} lastName={c.author.lastName} avatarUrl={c.author.avatarUrl} size="sm" />
          {mine ? 'Toi' : `${c.author.firstName} ${c.author.lastName}`} · {formatDateTime(c.createdAt)}
        </div>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">{c.description}</p>
        {c.attachmentName && (
          <button
            className="btn-secondary mt-4 !py-2"
            onClick={() => downloadFile(`/complaints/${c.id}/attachment`, c.attachmentName!).catch(() => toast.error("La pièce jointe n'a pas pu être téléchargée."))}
          >
            <DownloadIcon width={16} height={16} /> {c.attachmentName}
          </button>
        )}
        {c.category === 'BUREAU' && <p className="mt-4 text-xs text-ink-500">🔒 Catégorie « Le bureau » : seul le Pasteur la lit.</p>}
      </section>

      {c.canHandle && open && (
        <div className="mt-4 flex flex-wrap gap-2">
          {c.status === 'RECUE' && (
            <button className="btn-secondary" onClick={() => setClosing('EN_COURS')}>🔎 Prendre en charge</button>
          )}
          <button className="btn-secondary" onClick={() => setClosing('RESOLUE')}>✅ Marquer résolue</button>
          <button className="btn-ghost" onClick={() => setClosing('CLASSEE')}>📁 Classer</button>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">💬 Échanges</h2>
        {!c.messages.length ? (
          <p className="rounded-2xl bg-mist-200 p-4 text-sm text-ink-500">
            {mine ? 'Le bureau a bien reçu ton message. Tu seras prévenu dès qu’il répond.' : 'Pas encore de réponse.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {c.messages.map((m) => {
              const own = m.authorId === me?.id;
              const role = roleOf(m.author);
              return (
                <li key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${own ? 'rounded-br-md bg-mims-700 text-white' : 'rounded-bl-md bg-white shadow-soft ring-1 ring-ink-300/40'}`}>
                    <p className={`text-xs font-semibold ${own ? 'text-mims-100' : 'text-ink-500'}`}>
                      {own ? 'Toi' : `${m.author.firstName} ${m.author.lastName}`}
                      {role && ` · ${ROLE_LABELS[role] ?? role}`}
                    </p>
                    {m.newStatus && (
                      <p className={`mt-1 text-xs font-semibold ${own ? 'text-white' : 'text-ink-900'}`}>→ {STATUS[m.newStatus].label}</p>
                    )}
                    {m.content && <p className={`mt-1 whitespace-pre-line text-sm ${own ? 'text-white' : 'text-ink-700'}`}>{m.content}</p>}
                    <p className={`mt-1 text-[11px] ${own ? 'text-mims-100' : 'text-ink-500'}`}>{formatDateTime(m.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {open ? (
          <form
            className="sticky bottom-20 mt-4 flex items-end gap-2 rounded-2xl bg-white p-2 shadow-lift ring-1 ring-ink-300/40 lg:bottom-4"
            onSubmit={(e) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <textarea
              className="input min-h-12 flex-1 resize-none !border-0 !shadow-none focus:!ring-0"
              rows={2}
              placeholder={mine ? 'Ajouter une précision…' : 'Répondre…'}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              aria-label="Message"
            />
            <button type="submit" className="btn-primary shrink-0" disabled={!reply.trim() || send.isPending}>
              {send.isPending ? <Spinner /> : 'Envoyer'}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-center text-sm text-ink-500">
            Ce dossier est clos{c.closedAt && ` depuis le ${formatDateTime(c.closedAt)}`}. Besoin de revenir dessus ? Écris une nouvelle demande.
          </p>
        )}
      </section>

      <StatusModal status={closing} complaintId={c.id} onClose={() => setClosing(null)} onSaved={onSaved} />
    </div>
  );
}

const STATUS_COPY: Partial<Record<ComplaintStatus, { title: string; hint: string; required: boolean; button: string }>> = {
  EN_COURS: { title: 'Prendre en charge', hint: 'Un mot pour dire que tu t’en occupes (optionnel).', required: false, button: 'Prendre en charge' },
  RESOLUE: { title: 'Marquer résolue', hint: 'Explique ce qui a été fait (conseillé).', required: false, button: 'Marquer résolue' },
  CLASSEE: { title: 'Classer sans suite', hint: 'Explique pourquoi : la personne le lira.', required: true, button: 'Classer' },
};

function StatusModal({
  status,
  complaintId,
  onClose,
  onSaved,
}: {
  status: ComplaintStatus | null;
  complaintId: string;
  onClose: () => void;
  onSaved: (d: ComplaintDetail) => void;
}) {
  const [comment, setComment] = useState('');
  const copy = status ? STATUS_COPY[status] : undefined;

  const save = useMutation({
    mutationFn: () => api.patch<ComplaintDetail>(`/complaints/${complaintId}/status`, { status, comment }),
    onSuccess: (detail) => {
      onSaved(detail);
      toast.success('Statut mis à jour, la personne est prévenue ✅');
      setComment('');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le statut n'a pas pu être changé."),
  });

  if (!copy) return null;
  return (
    <Modal open={!!status} onClose={onClose} title={copy.title} description={copy.hint}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <textarea className="input min-h-28" value={comment} onChange={(e) => setComment(e.target.value)} required={copy.required} aria-label="Message à la personne" />
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={save.isPending || (copy.required && !comment.trim())}>
            {save.isPending && <Spinner />} {copy.button}
          </button>
        </div>
      </form>
    </Modal>
  );
}
