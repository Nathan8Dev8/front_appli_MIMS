'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { ChevronRightIcon, InboxIcon, PlusIcon, UploadIcon } from '@/components/ui/icons';
import { CATEGORY_LABELS, HANDLER_ROLES, KIND_LABELS, STATUS, isOpen } from '@/lib/complaints';
import { formatDate } from '@/lib/format';
import type { Complaint, ComplaintCategory, ComplaintKind } from '@/lib/types';

type Filter = 'ouvertes' | 'closes' | 'miennes';

export default function PlaintesPage() {
  const { data: me } = useMe();
  const isHandler = hasRole(me, HANDLER_ROLES);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('ouvertes');

  const { data: complaints, isLoading } = useQuery({ queryKey: ['complaints'], queryFn: () => api.get<Complaint[]>('/complaints') });

  // Un responsable trie les dossiers à traiter ; un membre ne voit que les siens, ouverts puis clos.
  const visible = (complaints ?? []).filter((c) =>
    filter === 'miennes' ? c.authorId === me?.id : filter === 'ouvertes' ? isOpen(c.status) : !isOpen(c.status),
  );
  const openCount = (complaints ?? []).filter((c) => isOpen(c.status)).length;

  return (
    <div>
      <PageHeader
        eyebrow="On t'écoute"
        title="Plaintes & suggestions"
        description="Un problème à signaler ou une idée pour le groupe ? Le Président et le Pasteur te répondent ici, en toute discrétion."
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon width={16} height={16} /> Écrire au bureau
          </button>
        }
      />

      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'ouvertes', label: isHandler ? 'À traiter' : 'En cours', badge: openCount },
          { value: 'closes', label: 'Traitées' },
          ...(isHandler ? [{ value: 'miennes' as const, label: 'Mes envois' }] : []),
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !visible.length ? (
        <EmptyState
          icon={<InboxIcon />}
          title={filter === 'ouvertes' ? 'Rien en attente 👌' : 'Rien ici pour l’instant'}
          description="Tes plaintes et suggestions, et les réponses du bureau, s'afficheront ici."
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((c) => (
            <li key={c.id}>
              <Link href={`/plaintes/${c.id}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-hover">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                    <span className="text-xs text-ink-500">{KIND_LABELS[c.kind]} · {CATEGORY_LABELS[c.category]}</span>
                  </div>
                  <p className="truncate font-semibold text-ink-900">{c.subject}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {c.reference} · {formatDate(c.createdAt)}
                    {c.authorId !== me?.id && ` · ${c.author.firstName} ${c.author.lastName}`}
                    {!!c._count?.messages && ` · 💬 ${c._count.messages}`}
                  </p>
                </div>
                <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateComplaintModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateComplaintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ComplaintKind>('PLAINTE');
  const [category, setCategory] = useState<ComplaintCategory>('ACTIVITES');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind('PLAINTE');
    setCategory('ACTIVITES');
    setSubject('');
    setDescription('');
    setFile(null);
  }, [open]);

  const send = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('category', category);
      form.append('subject', subject);
      form.append('description', description);
      if (file) form.append('file', file);
      return api.post<{ id: string }>('/complaints', form);
    },
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success(kind === 'PLAINTE' ? 'Plainte envoyée, le bureau est prévenu 📮' : 'Merci pour ton idée 💡');
      onClose();
      router.push(`/plaintes/${c.id}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ton message n'a pas pu être envoyé."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Écrire au bureau" description="Ton nom sera visible par ceux qui traitent ta demande. Personne d'autre ne la voit.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(['PLAINTE', 'SUGGESTION'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition ${
                kind === k ? 'bg-mims-700 text-white ring-mims-700' : 'bg-white text-ink-700 ring-ink-300/60 hover:ring-mims-300'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="pl-cat">Ça concerne</label>
          <select id="pl-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
            {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-500">
            {category === 'BUREAU'
              ? '🔒 Seul le Pasteur lira ce message.'
              : 'Lu par le Président et le Pasteur.'}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="pl-subject">Sujet</label>
          <input
            id="pl-subject"
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={kind === 'PLAINTE' ? 'Ex. Retard récurrent des réunions' : 'Ex. Organiser une sortie sportive'}
            maxLength={150}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="pl-desc">{kind === 'PLAINTE' ? 'Que s’est-il passé ?' : 'Ton idée'}</label>
          <textarea id="pl-desc" className="input min-h-32" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <span className="label">Pièce jointe (optionnel)</span>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300/60 px-3 py-4 text-center text-sm font-medium text-ink-500 hover:border-mims-400 hover:text-mims-700">
            <UploadIcon width={18} height={18} className="shrink-0" />
            <span className="truncate">{file ? file.name : 'Photo ou document'}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={send.isPending || !subject.trim() || !description.trim()}>
            {send.isPending && <Spinner />} Envoyer
          </button>
        </div>
      </form>
    </Modal>
  );
}
