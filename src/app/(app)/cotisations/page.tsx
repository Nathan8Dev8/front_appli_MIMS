'use client';

import { useState } from 'react';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { MyDues } from '@/components/cotisations/my-dues';
import { TreasuryPanel } from '@/components/cotisations/treasury-panel';

export default function CotisationsPage() {
  const { data: me } = useMe();
  const canManage = hasRole(me, ['TRESORIER', 'PRESIDENT_ADMIN']);
  const [tab, setTab] = useState<'perso' | 'gestion'>('perso');

  return (
    <div>
      <PageHeader
        eyebrow="Finances"
        title="Cotisations"
        description="500 FCFA par mois pour faire vivre notre communauté — simple, transparent, tracé."
      />

      {canManage && (
        <div className="mb-6 inline-flex rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-300/40">
          <button
            onClick={() => setTab('perso')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === 'perso' ? 'bg-mims-700 text-white' : 'text-ink-700'}`}
          >
            Mes cotisations
          </button>
          <button
            onClick={() => setTab('gestion')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === 'gestion' ? 'bg-mims-700 text-white' : 'text-ink-700'}`}
          >
            Gestion du groupe
          </button>
        </div>
      )}

      {tab === 'perso' || !canManage ? <MyDues /> : <TreasuryPanel />}
    </div>
  );
}
