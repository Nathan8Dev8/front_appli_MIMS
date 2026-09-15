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
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} animate-scale-in rounded-2xl bg-white p-6 shadow-lift sm:p-7`}>
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-mist-200"
          aria-label="Fermer"
        >
          <XIcon width={16} height={16} />
        </button>
        <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-ink-500">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
