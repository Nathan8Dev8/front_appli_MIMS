'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, downloadFile } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { DOCUMENT_MANAGER_ROLES } from '@/lib/events';
import { formatDate } from '@/lib/format';
import { Spinner } from '@/components/ui/spinner';
import { DocumentStatusBadge } from '@/components/ui/badge';
import { ArrowRightIcon, ChevronLeftIcon, DownloadIcon, EditIcon } from '@/components/ui/icons';
import { WriteReportForm } from '@/components/documents/report-form';
import type { AppDocument } from '@/lib/types';

type FullDocument = AppDocument & { contentHtml?: string | null; reportFor?: { id: string; title: string; kind: string } | null };

/** Lire un document : texte du rapport écrit dans l'appli, ou bouton pour ouvrir le fichier importé. */
export default function DocumentPage() {
  const id = useParams<{ id: string }>()?.id ?? '';
  const { data: me } = useMe();
  const canManage = hasRole(me, DOCUMENT_MANAGER_ROLES);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: doc, isLoading, error } = useQuery({ queryKey: ['documents', id], queryFn: () => api.get<FullDocument>(`/documents/${id}`) });

  const publish = useMutation({
    mutationFn: () => api.post(`/documents/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Publié, tout le monde est prévenu ✅');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ça n'a pas marché. Réessaie."),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>;
  if (error || !doc) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="text-lg font-semibold text-ink-900">Ce document est introuvable.</p>
        <Link href="/documents" className="btn-primary mt-4">Retour aux documents</Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">Modifier le rapport</h1>
        <WriteReportForm document={doc} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/documents" className="btn-ghost !px-3"><ChevronLeftIcon width={16} height={16} /> Documents</Link>
        <div className="flex flex-wrap gap-2">
          {canManage && doc.status === 'BROUILLON' && (
            <button className="btn-primary" onClick={() => publish.mutate()} disabled={publish.isPending}>
              {publish.isPending && <Spinner />} Publier
            </button>
          )}
          {canManage && doc.contentHtml != null && (
            <button className="btn-secondary" onClick={() => setEditing(true)}><EditIcon width={16} height={16} /> Modifier</button>
          )}
          {doc.contentHtml != null && (
            <button className="btn-secondary" onClick={() => window.print()}><DownloadIcon width={16} height={16} /> Imprimer ou PDF</button>
          )}
        </div>
      </div>

      <article className="card p-5 sm:p-10 print:p-0 print:shadow-none print:ring-0">
        <p className="text-sm font-semibold text-mims-700">📅 {formatDate(doc.documentDate ?? doc.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{doc.title}</h1>
        {doc.status !== 'PUBLIE' && <div className="mt-2"><DocumentStatusBadge status={doc.status} /></div>}
        {doc.description && <p className="mt-3 text-ink-700">{doc.description}</p>}

        {doc.contentHtml != null ? (
          // HTML assaini par le serveur à l'enregistrement (cleanReportHtml).
          <div className="report-content mt-6 border-t border-ink-300/30 pt-6" dangerouslySetInnerHTML={{ __html: doc.contentHtml }} />
        ) : (
          <button
            className="btn-primary mt-6 w-full !py-4 text-base sm:w-auto"
            onClick={() => downloadFile(`/documents/${doc.id}/download`).catch((e) => toast.error(e instanceof ApiError ? e.message : "Le fichier ne s'est pas ouvert. Réessaie."))}
          >
            <DownloadIcon width={18} height={18} /> Ouvrir le fichier
          </button>
        )}

        {doc.reportFor && (
          <Link href={`/evenements/${doc.reportFor.id}`} className="no-print mt-8 flex items-center justify-between gap-3 rounded-xl bg-mims-50 p-4 text-sm font-semibold text-mims-700">
            Voir la séance : {doc.reportFor.title}
            <ArrowRightIcon width={16} height={16} />
          </Link>
        )}
      </article>
    </div>
  );
}
