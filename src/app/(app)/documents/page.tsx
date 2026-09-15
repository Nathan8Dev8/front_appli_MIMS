'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DocumentStatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { DownloadIcon, FileTextIcon, PlusIcon, UploadIcon } from '@/components/ui/icons';
import { formatDate } from '@/lib/format';
import type { AppDocument } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = { REGLEMENT: 'Règlement intérieur', PV: 'Procès-verbal', AUTRE: 'Autre document' };

export default function DocumentsPage() {
  const { data: me } = useMe();
  const canPublish = hasRole(me, ['SECRETAIRE', 'PRESIDENT_ADMIN']);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => api.get<AppDocument[]>('/documents') });

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document publié et notifié à la communauté.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Publication impossible.'),
  });

  async function download(doc: AppDocument) {
    const res = await fetch(`${API_URL}/api/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  }

  const grouped = ['REGLEMENT', 'PV', 'AUTRE'].map((type) => ({
    type,
    items: (documents ?? []).filter((d) => d.type === type),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Vie institutionnelle"
        title="Documents"
        description="Le règlement intérieur et les procès-verbaux qui gardent la mémoire de notre communauté."
        actions={
          canPublish && (
            <button className="btn-primary" onClick={() => setUploadOpen(true)}>
              <PlusIcon width={16} height={16} /> Ajouter un document
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !documents?.length ? (
        <EmptyState icon={<FileTextIcon />} title="Aucun document pour l'instant" description="Le règlement et les comptes-rendus apparaîtront ici dès leur publication." />
      ) : (
        <div className="space-y-8">
          {grouped.filter((g) => g.items.length).map((group) => (
            <div key={group.type}>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{TYPE_LABELS[group.type]}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.items.map((doc) => (
                  <div key={doc.id} className="card animate-fade-up flex items-start gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mims-50 text-mims-700">
                      <FileTextIcon width={20} height={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{doc.title}</p>
                      {doc.description && <p className="mt-1 line-clamp-2 text-xs text-ink-500">{doc.description}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DocumentStatusBadge status={doc.status} />
                          <span className="text-xs text-ink-500">{formatDate(doc.publishedAt ?? doc.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {canPublish && doc.status === 'BROUILLON' && (
                            <button onClick={() => publish.mutate(doc.id)} className="text-xs font-semibold text-mims-700 hover:text-mims-800">
                              Publier
                            </button>
                          )}
                          <button onClick={() => download(doc)} className="flex h-8 w-8 items-center justify-center rounded-full text-mims-700 hover:bg-mims-50" aria-label="Télécharger">
                            <DownloadIcon width={16} height={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDocumentModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

function UploadDocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('PV');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('file', file!);
      return api.post('/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document ajouté. Publie-le pour le rendre visible à tous.');
      handleClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'envoi a échoué."),
  });

  function handleClose() {
    setType('PV');
    setTitle('');
    setDescription('');
    setFile(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Ajouter un document" description="Formats acceptés : PDF, images, documents bureautiques.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <div>
          <label className="label">Type de document</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="PV">Procès-verbal</option>
            <option value="REGLEMENT">Règlement intérieur</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
        <div>
          <label className="label">Titre</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Description (optionnel)</label>
          <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Fichier</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300/60 py-6 text-sm font-medium text-ink-500 hover:border-mims-400 hover:text-mims-700">
            <UploadIcon width={18} height={18} />
            {file ? file.name : 'Choisir un fichier'}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={!file || !title || upload.isPending}>
            {upload.isPending && <Spinner />}
            Envoyer
          </button>
        </div>
      </form>
    </Modal>
  );
}
