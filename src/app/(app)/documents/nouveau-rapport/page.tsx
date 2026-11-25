'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { UploadReportForm, WriteReportForm } from '@/components/documents/report-form';
import { DOCUMENT_MANAGER_ROLES } from '@/lib/events';

export default function NewReportPage() {
  return (
    <RequireRole roles={DOCUMENT_MANAGER_ROLES}>
      <Suspense>
        <NewReport />
      </Suspense>
    </RequireRole>
  );
}

function NewReport() {
  const eventId = useSearchParams()?.get('event') ?? undefined;
  const [mode, setMode] = useState<'ecrire' | 'importer' | null>(null);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Documents" title="Rapport de séance" description="Écris le rapport ici, ou importe un fichier déjà prêt." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {[
          { value: 'ecrire' as const, emoji: '✍️', title: 'Écrire le rapport', text: 'Avec titres, gras, listes, couleurs…' },
          { value: 'importer' as const, emoji: '📎', title: 'Importer un fichier', text: 'PDF, Word ou photo du rapport papier' },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={mode === o.value}
            onClick={() => setMode(o.value)}
            className={`card flex items-center gap-4 p-5 text-left transition hover:shadow-hover ${mode === o.value ? '!ring-2 !ring-mims-700' : ''}`}
          >
            <span className="text-3xl" aria-hidden="true">{o.emoji}</span>
            <span>
              <span className="block text-lg font-semibold text-ink-900">{o.title}</span>
              <span className="block text-sm text-ink-500">{o.text}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === 'ecrire' && <WriteReportForm initialEventId={eventId} />}
      {mode === 'importer' && <UploadReportForm initialEventId={eventId} />}
      {!mode && <p className="text-center text-sm text-ink-500">Choisis une des deux façons ci-dessus pour commencer.</p>}
    </div>
  );
}
