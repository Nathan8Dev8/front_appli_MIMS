'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { BellIcon, ChevronRightIcon } from '@/components/ui/icons';
import { timeAgo } from '@/lib/format';
import { notificationUrl } from '@/lib/notifications';
import type { AppNotification } from '@/lib/types';

const TYPE_TONE: Record<string, string> = {
  RECU: 'bg-emerald-50 text-emerald-600',
  RAPPEL_COTISATION: 'bg-amber-50 text-amber-600',
  RELANCE_DETTE: 'bg-rose-50 text-rose-600',
  ANNIVERSAIRE: 'bg-gold-100 text-gold-500',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useQuery({ queryKey: ['notifications', 'me'], queryFn: () => api.get<AppNotification[]>('/notifications/me') });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const unread = notifications?.filter((n) => n.status !== 'LU').length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Tes messages"
        title="Notifications"
        description="Les derniers messages du groupe et du bureau."
        actions={
          unread > 0 && (
            <button className="btn-secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              Tout marquer comme lu ({unread})
            </button>
          )
        }
      />

      {isLoading ? null : !notifications?.length ? (
        <EmptyState icon={<BellIcon />} title="Rien de nouveau pour l'instant" description="Tes rappels, tes reçus et les annonces s'afficheront ici." />
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id}>
              {/* Toucher une notification ouvre la page concernée (et la marque comme lue). */}
              <Link
                href={notificationUrl(n)}
                onClick={() => n.status !== 'LU' && markRead.mutate(n.id)}
                className={`card flex items-start gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-hover ${n.status !== 'LU' ? 'ring-1 ring-mims-200' : ''}`}
              >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TYPE_TONE[n.type] ?? 'bg-mims-50 text-mims-700'}`}>
                <BellIcon width={18} height={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink-900">{n.title}</p>
                  {n.status !== 'LU' && <span className="h-2 w-2 shrink-0 rounded-full bg-mims-700" />}
                </div>
                <p className="mt-0.5 text-sm text-ink-700">{n.content}</p>
                <p className="mt-1.5 text-xs text-ink-500">{timeAgo(n.createdAt)}</p>
              </div>
              <ChevronRightIcon width={18} height={18} className="mt-2.5 shrink-0 text-ink-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
