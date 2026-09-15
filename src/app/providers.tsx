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
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  // Débloque l'audio dès la première interaction : les navigateurs refusent
  // de jouer un son tant qu'aucun geste utilisateur n'a eu lieu sur la page.
  useEffect(() => {
    const unlock = () => primeNotificationSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
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
