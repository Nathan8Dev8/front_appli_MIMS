'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError, fileUrl } from '@/lib/api-client';
import { useMe, hasRole } from '@/hooks/use-me';
import { ANNOUNCEMENT_AUTHOR_ROLES } from '@/lib/nav';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { MegaphoneIcon, PlusIcon, UploadIcon, FileTextIcon, DownloadIcon } from '@/components/ui/icons';
import { timeAgo } from '@/lib/format';
import type { Announcement } from '@/lib/types';

export default function AnnoncesPage() {
  const { data: me } = useMe();
  const canPublish = hasRole(me, ANNOUNCEMENT_AUTHOR_ROLES);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/announcements'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Le mot du bureau"
        title="Annonces"
        description="Les messages du pasteur, de la présidence et du secrétariat."
        actions={
          canPublish && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon width={16} height={16} /> Nouvelle annonce
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-mims-700" /></div>
      ) : !announcements?.length ? (
        <EmptyState
          icon={<MegaphoneIcon />}
          title="Pas d'annonce pour l'instant"
          description="Quand le bureau publie un message, il apparaît ici et tout le monde est prévenu."
        />
      ) : (
        <div className="space-y-5">
          {announcements.map((a) => (
            <article key={a.id} className="card animate-fade-up p-6">
              <div className="flex items-center gap-3">
                <Avatar firstName={a.publishedBy.firstName} lastName={a.publishedBy.lastName} avatarUrl={a.publishedBy.avatarUrl} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{a.publishedBy.firstName} {a.publishedBy.lastName}</p>
                  <p className="text-xs text-ink-500">{timeAgo(a.publishedAt)}</p>
                </div>
              </div>

              <h2 className="mt-4 font-display text-lg font-semibold text-ink-900">{a.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{a.content}</p>

              {a.attachmentKey && (
                <div className="mt-4">
                  {a.attachmentMime?.startsWith('image/') ? (
                    <a href={fileUrl(a.attachmentKey)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-black/[0.05]">
                      <Image
                        src={fileUrl(a.attachmentKey)!}
                        alt={a.attachmentName ?? a.title}
                        width={640}
                        height={360}
                        className="max-h-96 w-full object-cover"
                        unoptimized
                      />
                    </a>
                  ) : (
                    <a
                      href={fileUrl(a.attachmentKey)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 rounded-xl bg-mist-200 px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-mims-50 hover:text-mims-800"
                    >
                      <FileTextIcon width={17} height={17} className="text-mims-700" />
                      {a.attachmentName ?? 'Pièce jointe'}
                      <DownloadIcon width={15} height={15} className="text-ink-500" />
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <CreateAnnouncementModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateAnnouncementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (file) formData.append('file', file);
      return api.post('/announcements', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Annonce publiée, tout le monde est prévenu ✅');
      handleClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'annonce n'a pas pu être publiée."),
  });

  function handleClose() {
    setTitle('');
    setContent('');
    setFile(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nouvelle annonce" description="Elle est publiée tout de suite et chaque membre reçoit une notification.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <label className="label">Titre</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea className="input min-h-32" value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>
        <div>
          <label className="label">Pièce jointe (optionnel)</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300/60 py-6 text-sm font-medium text-ink-500 hover:border-mims-400 hover:text-mims-700">
            <UploadIcon width={18} height={18} />
            {file ? file.name : 'Choisis une image ou un fichier'}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={handleClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={!title || !content || create.isPending}>
            {create.isPending && <Spinner />}
            Publier l'annonce
          </button>
        </div>
      </form>
    </Modal>
  );
}
