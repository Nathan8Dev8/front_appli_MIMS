'use client';

import { useState } from 'react';
import { useMe, hasRole } from '@/hooks/use-me';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { nextCotisationSunday } from '@/lib/finance';
import { formatDate } from '@/lib/format';
import { MyDues } from '@/components/cotisations/my-dues';
import { TreasuryPanel } from '@/components/cotisations/treasury-panel';

export default function CotisationsPage() {
  const { data: me } = useMe();
  const canManage = hasRole(me, ['TRESORIER', 'PRESIDENT_ADMIN']);
  const [tab, setTab] = useState<'gestion' | 'perso'>('gestion');
  const managing = canManage && tab === 'gestion';

  return (
    <div>
      <PageHeader
        eyebrow="Finances"
        title={managing ? 'Caisse & cotisations' : 'Cotisations'}
        description={
          managing
            ? "Encaisse, note les sorties, suis les collectes et les retards de cotisation."
            : `500 FCFA par mois, à régler le 2e dimanche du mois (prochain : ${formatDate(nextCotisationSunday(), { weekday: 'long', day: 'numeric', month: 'long' })}). Ici, tu vois ce que tu as payé et ce qu'il te reste.`
        }
      />

      {canManage && (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'gestion', label: 'Caisse du groupe' },
            { value: 'perso', label: 'Mes cotisations' },
          ]}
        />
      )}

      {managing ? <TreasuryPanel /> : <MyDues />}
    </div>
  );
}
