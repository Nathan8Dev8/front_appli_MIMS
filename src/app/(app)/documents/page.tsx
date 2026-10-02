'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DocumentStatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { ArchiveIcon, ArrowRightIcon, DownloadIcon, EditIcon, FileTextIcon, PlusIcon, UploadIcon } from '@/components/ui/icons';
import { DOCUMENT_MANAGER_ROLES } from '@/lib/events';
import { formatDate } from '@/lib/format';
import type { AppDocument, AppEvent } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  REGLEMENT: 'Règlement intérieur',
  ASSISE: "Rapports d'assise",
  PV: 'Procès-verbaux',
  AUTRE: 'Autres documents',
};

const docDate = (d: AppDocument) => d.documentDate ?? d.publishedAt ?? d.createdAt;

export default function DocumentsPage() {
  const { data: me } = useMe();
  const canManage = hasRole(me, DOCUMENT_MANAGER_ROLES);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppDocument | undefined>();

  const { data: documents, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => api.get<AppDocument[]>('/documents') });

  const action = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'publish' | 'archive' }) => api.post(`/documents/${id}/${verb}`),
    onSuccess: (_, { verb }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(verb === 'publish' ? 'Document publié, tout le monde est prévenu ✅' : "Archivé. Il reste consultable dans l'Historique.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas marché."),
  });

  const grouped = Object.keys(TYPE_LABELS).map((type) => ({
    type,
    items: (documents ?? []).filter((d) => d.type === type),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Les papiers du groupe"
        title="Documents"
        description="Le règlement intérieur, les rapports d'assise, les procès-verbaux et les autres documents en vigueur."
        actions={
          canManage && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <PlusIcon width={16} height={16} /> Ajouter un document
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !documents?.length ? (
        <EmptyState icon={<FileTextIcon />} title="Pas encore de document" description="Le règlement et les procès-verbaux seront ici dès qu'ils sont publiés." />
      ) : (
        <div className="space-y-8">
          {grouped.filter((g) => g.items.length).map((group) => (
            <section key={group.type}>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{TYPE_LABELS[group.type]}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((doc) => (
                  <div key={doc.id} className="card animate-fade-up flex flex-col p-4 sm:p-5">
                    <button
                      className="flex items-start gap-3 text-left"
                      onClick={() => downloadFile(`/documents/${doc.id}/download`).catch((e) => toast.error(e instanceof ApiError ? e.message : "Le téléchargement n'a pas marché."))}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mims-50 text-mims-700">
                        <FileTextIcon width={20} height={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink-900">{doc.title}</span>
                        {doc.description && <span className="mt-1 line-clamp-2 block text-xs text-ink-500">{doc.description}</span>}
                        <span className="mt-1.5 flex items-center gap-2 text-xs text-ink-500">
                          {doc.status !== 'PUBLIE' && <DocumentStatusBadge status={doc.status} />}
                          {formatDate(docDate(doc))}
                        </span>
                      </span>
                      <DownloadIcon width={18} height={18} className="mt-1 shrink-0 text-mims-700" />
                    </button>

                    {(doc.reportFor || canManage) && (
                      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-ink-300/30 pt-3">
                        {doc.reportFor && (
                          <Link href={`/evenements/${doc.reportFor.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">
                            {doc.type === 'ASSISE' ? "Voir l'assise" : 'Voir la réunion'} <ArrowRightIcon width={14} height={14} />
                          </Link>
                        )}
                        {canManage && (
                          <div className="ml-auto flex items-center gap-1">
                            {doc.status === 'BROUILLON' && (
                              <button onClick={() => action.mutate({ id: doc.id, verb: 'publish' })} disabled={action.isPending} className="btn-primary !px-3 !py-1.5 text-xs">
                                Publier
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditing(doc);
                                setFormOpen(true);
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-mims-50 hover:text-mims-700"
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              <EditIcon width={16} height={16} />
                            </button>
                            <button
                              onClick={() => action.mutate({ id: doc.id, verb: 'archive' })}
                              disabled={action.isPending}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-mims-50 hover:text-mims-700"
                              aria-label="Archiver"
                              title="Archiver (reste dans l'Historique)"
                            >
                              <ArchiveIcon width={16} height={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Link
        href="/historique?type=documents"
        className="mt-8 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm font-semibold text-mims-700 shadow-soft ring-1 ring-ink-300/40 transition hover:bg-mims-50"
      >
        🕰️ Documents archivés et anciens rapports
        <ArrowRightIcon width={16} height={16} />
      </Link>

      {canManage && <DocumentFormModal open={formOpen} onClose={() => setFormOpen(false)} document={editing} />}
    </div>
  );
}

/** Ajout (avec fichier) ou modification (sans fichier) d'un document. */
function DocumentFormModal({ open, onClose, document }: { open: boolean; onClose: () => void; document?: AppDocument }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('PV');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [eventId, setEventId] = useState('');

  // Les assises auxquelles un rapport peut être rattaché, de la plus récente à la plus ancienne.
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events'), enabled: open });
  const assises = (events ?? []).filter((e) => e.kind === 'ASSISE' && e.status !== 'ANNULE').reverse();

  useEffect(() => {
    if (!open) return;
    setEventId(document?.reportFor?.id ?? '');
    setType(document?.type ?? 'PV');
    setTitle(document?.title ?? '');
    setDescription(document?.description ?? '');
    setDocumentDate(document?.documentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setFile(null);
  }, [open, document]);

  const save = useMutation({
    mutationFn: () => {
      const link = type === 'ASSISE' ? eventId : undefined;
      if (document) return api.patch(`/documents/${document.id}`, { type, title, description, documentDate, eventId: link });
      const formData = new FormData();
      formData.append('type', type);
      formData.append('title', title);
      formData.append('documentDate', documentDate);
      if (link) formData.append('eventId', link);
      if (description) formData.append('description', description);
      formData.append('file', file!);
      return api.post('/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(
        document
          ? 'Modifications enregistrées ✅'
          : type === 'ASSISE'
            ? "Rapport publié et rattaché à l'assise ✅"
            : 'Document ajouté. Publie-le pour que tout le monde le voie.',
      );
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le document n'a pas pu être enregistré."),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={document ? 'Modifier le document' : 'Ajouter un document'}
      description={document ? undefined : 'PDF, images, Word ou Excel.'}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="doc-type">Type</label>
            <select id="doc-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="ASSISE">Rapport d'assise</option>
              <option value="PV">Procès-verbal</option>
              <option value="REGLEMENT">Règlement intérieur</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="doc-date">Date du document</label>
            <input id="doc-date" type="date" className="input" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} required />
          </div>
        </div>
        {type === 'ASSISE' && (
          <div>
            <label className="label" htmlFor="doc-event">Assise concernée</label>
            <select
              id="doc-event"
              className="input"
              value={eventId}
              required
              onChange={(e) => {
                const event = assises.find((a) => a.id === e.target.value);
                setEventId(e.target.value);
                // On préremplit la date et le titre à partir de l'assise choisie.
                if (event) {
                  setDocumentDate(event.startsAt.slice(0, 10));
                  if (!title) setTitle(`Rapport d'assise — ${event.title}`);
                }
              }}
            >
              <option value="">Choisir une assise…</option>
              {assises.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.startsAt)} · {a.title}
                  {a.reportDocument && a.reportDocument.id !== document?.id ? ' (a déjà un rapport)' : ''}
                </option>
              ))}
            </select>
            {!assises.length && <p className="mt-1.5 text-xs text-ink-500">Aucune assise pour l'instant : crée-la d'abord dans Événements.</p>}
            {(() => {
              const chosen = assises.find((a) => a.id === eventId);
              return chosen?.reportDocument && chosen.reportDocument.id !== document?.id ? (
                <p className="mt-1.5 text-xs text-amber-700">Cette assise a déjà un rapport : il passera aux archives.</p>
              ) : null;
            })()}
          </div>
        )}
        <div>
          <label className="label" htmlFor="doc-title">Titre</label>
          <input id="doc-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="doc-desc">Description (optionnel)</label>
          <textarea id="doc-desc" className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {!document && (
          <div>
            <span className="label">Fichier</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300/60 px-3 py-6 text-center text-sm font-medium text-ink-500 hover:border-mims-400 hover:text-mims-700">
              <UploadIcon width={18} height={18} className="shrink-0" />
              <span className="truncate">{file ? file.name : 'Choisir un fichier'}</span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={(!document && !file) || !title || (type === 'ASSISE' && !eventId) || save.isPending}>
            {save.isPending && <Spinner />}
            {document ? 'Enregistrer' : 'Envoyer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
