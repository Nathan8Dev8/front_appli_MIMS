'use client';

import { usePathname } from 'next/navigation';
import { pageEmoji } from '@/lib/nav';

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
  const emoji = pageEmoji(usePathname());
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-mims-500">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold sm:text-3xl tracking-tight text-ink-900">
          {emoji && <span className="mr-2" aria-hidden="true">{emoji}</span>}
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
      {/* Sur mobile, le bouton d'action principal prend toute la largeur : plus facile à toucher. */}
      {actions && <div className="flex shrink-0 items-center gap-3 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}
