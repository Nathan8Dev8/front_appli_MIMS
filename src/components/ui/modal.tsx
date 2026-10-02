'use client';

import { useEffect } from 'react';
import { XIcon } from './icons';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (!open) return;
    document.addEventListener('keydown', onKey);
    // La page derrière ne doit pas défiler pendant qu'une fenêtre est ouverte.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Sur mobile : panneau qui monte du bas (atteignable au pouce) ; sur grand écran : fenêtre centrée.
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative max-h-[92dvh] w-full ${maxWidth} animate-fade-up overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift sm:animate-scale-in sm:rounded-2xl sm:p-7`}
      >
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-ink-300/60 sm:hidden" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-mist-200"
          aria-label="Fermer"
        >
          <XIcon width={16} height={16} />
        </button>
        <h2 className="pr-10 font-display text-xl font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-ink-500">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
