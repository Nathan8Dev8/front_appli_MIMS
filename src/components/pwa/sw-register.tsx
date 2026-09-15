'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Enregistré aussi en développement : les notifications push en dépendent
    // (localhost est traité comme un contexte sécurisé par les navigateurs).
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  return null;
}
