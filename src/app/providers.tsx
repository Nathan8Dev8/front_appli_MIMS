'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { primeNotificationSound } from '@/lib/sound';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
        },
      }),
  );

  // Débloque l'audio à chaque interaction : les navigateurs refusent de jouer un son
  // sans geste de l'utilisateur, et le remettent en pause quand l'appli passe en
  // arrière-plan (téléphone verrouillé, autre appli…). Un seul déblocage ne suffit pas.
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
