'use client';

import { useQuery } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { DueStatusBadge, PaymentStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatFcfa, formatMonth } from '@/lib/format';
import { DownloadIcon, WalletIcon } from '@/components/ui/icons';
import type { MonthlyDue, Payment } from '@/lib/types';

export function MyDues() {
  const token = useAuthStore((s) => s.token);
  const { data: dues } = useQuery({ queryKey: ['dues', 'me'], queryFn: () => api.get<MonthlyDue[]>('/dues/me') });
  const { data: payments } = useQuery({ queryKey: ['payments', 'me'], queryFn: () => api.get<Payment[]>('/payments/me') });

  const totalBalance = (dues ?? []).reduce((s, d) => s + d.balance, 0);

  async function downloadReceipt(receiptId: string) {
    const res = await fetch(`${API_URL}/api/receipts/${receiptId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="card animate-fade-up flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${totalBalance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <WalletIcon width={22} height={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Solde à régulariser</p>
            <p className="font-display text-2xl font-semibold text-ink-900">{formatFcfa(totalBalance)}</p>
          </div>
        </div>
        <p className="max-w-sm text-sm text-ink-500">
          {totalBalance > 0
            ? "Rapproche-toi du trésorier lors de la prochaine rencontre pour régulariser ta cotisation."
            : "Bravo, tu es à jour ! Merci pour ta fidélité envers la communauté."}
        </p>
      </div>

      <div className="card animate-fade-up p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Mes échéances</h2>
        {!dues?.length ? (
          <EmptyState title="Aucune échéance pour le moment" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="pb-3">Mois</th>
                  <th className="pb-3">Montant</th>
                  <th className="pb-3">Payé</th>
                  <th className="pb-3">Solde</th>
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/30">
                {dues.map((due) => (
                  <tr key={due.id}>
                    <td className="py-3 font-medium capitalize text-ink-900">{formatMonth(due.dueMonth)}</td>
                    <td className="py-3 text-ink-700">{formatFcfa(due.amountDue)}</td>
                    <td className="py-3 text-ink-700">{formatFcfa(due.amountPaid)}</td>
                    <td className="py-3 font-semibold text-ink-900">{formatFcfa(due.balance)}</td>
                    <td className="py-3"><DueStatusBadge status={due.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card animate-fade-up p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Mes paiements &amp; reçus</h2>
        {!payments?.length ? (
          <EmptyState title="Aucun paiement enregistré" description="Ton historique de versements apparaîtra ici." />
        ) : (
          <ul className="divide-y divide-ink-300/30">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div>
                  <p className="font-medium text-ink-900">{formatFcfa(p.amount)} · {methodLabel(p.method)}</p>
                  <p className="text-xs text-ink-500">{formatDate(p.paidAt)} · Réf. {p.paymentRef}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PaymentStatusBadge status={p.status} />
                  {p.receipt && (
                    <button
                      onClick={() => downloadReceipt(p.receipt!.id)}
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                    >
                      <DownloadIcon width={14} height={14} /> Reçu
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function methodLabel(method: string) {
  return { CASH: 'Espèces', MOBILE_MONEY: 'Mobile Money', VIREMENT: 'Virement', AUTRE: 'Autre' }[method] ?? method;
}
