'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { Toaster } from 'react-hot-toast';
import { primeNotificationSound } from '@/lib/sound';
import { applyLargeText, readLargeText } from '@/lib/text-size';

/** Dernières données vues, gardées sur le téléphone pour l'appli hors ligne. */
export const CACHE_KEY = 'jeunes-mims-cache';
const CACHE_MAX_AGE = 7 * 24 * 3600 * 1000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
          // Hors ligne, une action part tout de suite : soit dans la file (api.offline), soit en erreur claire.
          mutations: { networkMode: 'always' },
        },
      }),
  );

  // Débloque l'audio à chaque interaction : les navigateurs refusent de jouer un son
  // sans geste de l'utilisateur, et le remettent en pause quand l'appli passe en
  // arrière-plan (téléphone verrouillé, autre appli…). Un seul déblocage ne suffit pas.
  useEffect(() => {
    if (readLargeText()) applyLargeText(true);
  }, []);

  // Recharge les dernières données vues (même compte, moins de 7 jours), puis les
  // réenregistre à chaque changement : hors ligne, les écrans ne sont pas vides.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
      if (saved && saved.memberId === useAuthStore.getState().member?.id && Date.now() - saved.at < CACHE_MAX_AGE) {
        hydrate(client, saved.state);
      }
    } catch {
      // cache illisible : on repart du réseau
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = client.getQueryCache().subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const memberId = useAuthStore.getState().member?.id;
        if (!memberId) return;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ memberId, at: Date.now(), state: dehydrate(client) }));
        } catch {
          // stockage plein : on garde l'ancienne copie
        }
      }, 1000);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    const unlock = () => primeNotificationSound();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#113E7D',
            color: '#F0F4F4',
            borderRadius: '9999px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
          },
          success: { iconTheme: { primary: '#F0F4F4', secondary: '#113E7D' } },
        }}
      />
    </QueryClientProvider>
  );
}
