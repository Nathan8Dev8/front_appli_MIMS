'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { BellIcon } from '@/components/ui/icons';
import { playNotificationChime } from '@/lib/sound';

interface NotificationItem {
  id: string;
  status: string;
  title: string;
  content: string;
}

export function Topbar() {
  const member = useAuthStore((s) => s.member);
  const knownUnreadIds = useRef<Set<string> | null>(null);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => api.get<NotificationItem[]>('/notifications/me'),
    refetchInterval: 30_000,
  });

  // Joue un carillon (+ toast) dès qu'une notification jusque-là inconnue
  // apparaît — jamais au tout premier chargement, pour ne pas sonner sur
  // des notifications déjà anciennes en arrivant sur l'app.
  useEffect(() => {
    if (!notifications) return;
    const unreadIds = new Set(notifications.filter((n) => n.status !== 'LU').map((n) => n.id));

    if (knownUnreadIds.current === null) {
      knownUnreadIds.current = unreadIds;
      return;
    }

    const fresh = notifications.filter((n) => n.status !== 'LU' && !knownUnreadIds.current!.has(n.id));
    if (fresh.length > 0) {
      playNotificationChime();
      toast(fresh.length === 1 ? fresh[0].title : `${fresh.length} nouvelles notifications`, { icon: '🔔' });
    }
    knownUnreadIds.current = unreadIds;
  }, [notifications]);

  // Une notification push arrive pendant que l'appli est ouverte : on recharge tout de suite
  // (au lieu d'attendre le prochain passage toutes les 30 s) ; l'effet ci-dessus joue le son.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'push') queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [queryClient]);

  const unread = notifications?.filter((n) => n.status !== 'LU').length ?? 0;

  // Pastille sur l'icône de l'appli installée (comme une messagerie).
  useEffect(() => {
    if (!notifications) return;
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (unread ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => undefined);
  }, [notifications, unread]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-300/40 bg-mist-100/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-8">
      <Link href="/tableau-de-bord" className="flex items-center gap-2 lg:hidden">
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span className="font-display text-base font-semibold tracking-tight text-ink-900">Jeunes MIMS</span>
      </Link>

      <div className="hidden text-sm font-medium text-ink-500 lg:block">
        {greeting()}, {member?.firstName ?? ''} 👋
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition hover:bg-mims-50"
          aria-label="Notifications"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mims-700 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <Link href="/mon-profil" className="flex items-center gap-2 rounded-full pl-1 pr-1 transition hover:bg-mims-50">
          <Avatar firstName={member?.firstName} lastName={member?.lastName} avatarUrl={member?.avatarUrl} size="sm" />
        </Link>
      </div>
    </header>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
