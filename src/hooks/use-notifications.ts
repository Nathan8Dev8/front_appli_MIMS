'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { NAV_ITEMS_HREFS } from '@/lib/nav';
import type { AppNotification } from '@/lib/types';

/** Notifications du membre : une seule requête partagée par la cloche et les bulles du menu. */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => api.get<AppNotification[]>('/notifications/me'),
    refetchInterval: 30_000,
  });
}

/** Rubrique du menu à laquelle mène une adresse : /evenements/123 → /evenements. */
const sectionOf = (url?: string | null) => (url ? `/${url.split(/[/?#]/)[1] ?? ''}` : null);

/** Nombre de nouveautés (notifications non lues) par rubrique du menu. */
export function useNavBadges() {
  const { data } = useNotifications();
  const counts: Record<string, number> = {};
  for (const n of data ?? []) {
    if (n.status === 'LU') continue;
    // L'entrée « Notifications » montre le total, comme la cloche.
    counts['/notifications'] = (counts['/notifications'] ?? 0) + 1;
    const section = sectionOf(n.url);
    if (section && section !== '/notifications' && NAV_ITEMS_HREFS.includes(section)) counts[section] = (counts[section] ?? 0) + 1;
  }
  return counts;
}

/** Ouvrir une rubrique qui a des nouveautés les marque comme vues : sa bulle disparaît. */
export function useMarkSectionSeen() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const counts = useNavBadges();
  const section = sectionOf(pathname);
  const pending = section ? counts[section] ?? 0 : 0;

  useEffect(() => {
    if (!section || !pending || section === '/notifications') return;
    api
      .patch('/notifications/read-section', { path: section })
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => undefined);
  }, [section, pending, queryClient]);
}
