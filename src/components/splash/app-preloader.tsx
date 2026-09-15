'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

const MIN_DISPLAY_MS = 1250;

export function AppPreloader({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = hydrated && minTimeElapsed;

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setVisible(false), 320);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <>
      {visible && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-mims-gradient transition-opacity duration-300"
          style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? 'none' : 'auto' }}
          aria-hidden={ready}
        >
          <div className="bg-noise absolute inset-0 opacity-40" />

          <div className="relative flex flex-col items-center animate-scale-in">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white/95 shadow-lift ring-1 ring-white/40 sm:h-36 sm:w-36">
              <Image src="/logo.png" alt="Jeunes MIMS" width={104} height={104} priority className="drop-shadow-sm" />
            </div>

            <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/3 rounded-full bg-white/90 animate-loading-bar" />
            </div>
          </div>
        </div>
      )}
      <div style={{ visibility: visible ? 'hidden' : 'visible' }}>{children}</div>
    </>
  );
}
