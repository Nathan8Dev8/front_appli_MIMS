'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { pageEmoji, pageHelp } from '@/lib/nav';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const emoji = pageEmoji(pathname);
  const help = pageHelp(pathname);
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-mims-500">{eyebrow}</p>}
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl tracking-tight text-ink-900">
            {emoji && <span className="mr-2" aria-hidden="true">{emoji}</span>}
            {title}
          </h1>
          {help && (
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              aria-expanded={helpOpen}
              aria-label="Aide sur cette page"
              title="Aide"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ring-1 transition ${
                helpOpen ? 'bg-mims-700 text-white ring-mims-700' : 'bg-white text-mims-700 ring-mims-200 hover:bg-mims-50'
              }`}
            >
              ?
            </button>
          )}
        </div>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>}
        {help && helpOpen && (
          <p className="mt-3 max-w-2xl rounded-xl bg-mims-50 px-4 py-3 text-sm leading-relaxed text-ink-900 ring-1 ring-mims-100">💡 {help}</p>
        )}
      </div>
      {/* Sur mobile, le bouton d'action principal prend toute la largeur : plus facile à toucher. */}
      {actions && <div className="flex shrink-0 items-center gap-3 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}
