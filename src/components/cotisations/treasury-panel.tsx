'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { PaymentStatusBadge } from '@/components/ui/badge';
import { formatFcfa, formatDate } from '@/lib/format';
import { PlusIcon, SparkleIcon } from '@/components/ui/icons';
import type { MemberSummary, Payment } from '@/lib/types';

interface DebtRow {
  member: { id: string; firstName: string; lastName: string };
  monthsLate: number;
  totalDebt: number;
}

const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'AUTRE', label: 'Autre' },
];

export function TreasuryPanel() {
  const queryClient = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');

  const { data: members } = useQuery({ queryKey: ['members', 'all'], queryFn: () => api.get<MemberSummary[]>('/members') });
  const { data: payments } = useQuery({ queryKey: ['payments', 'all'], queryFn: () => api.get<Payment[]>('/payments') });
  const { data: debtSummary } = useQuery({ queryKey: ['dues', 'debt-summary'], queryFn: () => api.get<DebtRow[]>('/dues/debt-summary') });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['dues'] });
  };

  const generateDues = useMutation({
    mutationFn: () => api.post('/dues/generate'),
    onSuccess: () => {
      toast.success('Échéances du mois générées.');
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Échec de la génération.'),
  });

  const confirmPayment = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/confirm`),
    onSuccess: () => {
      toast.success('Paiement validé, reçu généré et envoyé.');
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Validation impossible.'),
  });

  const reversePayment = useMutation({
    mutationFn: () => api.post(`/payments/${reversalTarget!.id}/reverse`, { reason }),
    onSuccess: () => {
      toast.success('Contre-passation enregistrée.');
      setReversalTarget(null);
      setReason('');
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Contre-passation impossible.'),
  });

  const pending = (payments ?? []).filter((p) => p.status === 'EN_ATTENTE');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">Gestion des cotisations</h2>
          <p className="text-sm text-ink-500">Réservé au trésorier et à la présidence.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => generateDues.mutate()} disabled={generateDues.isPending}>
            {generateDues.isPending && <Spinner />}
            <SparkleIcon width={16} height={16} /> Générer les échéances du mois
          </button>
          <button className="btn-primary" onClick={() => setRecordOpen(true)}>
            <PlusIcon width={16} height={16} /> Enregistrer un versement
          </button>
        </div>
      </div>

      {!!debtSummary?.length && (
        <div className="card p-6">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900">Arriérés à surveiller</h3>
          <ul className="divide-y divide-ink-300/30">
            {debtSummary.slice(0, 8).map((row) => (
              <li key={row.member.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-ink-900">{row.member.firstName} {row.member.lastName}</span>
                <span className="text-ink-500">{row.monthsLate} mois · <span className="font-semibold text-rose-600">{formatFcfa(row.totalDebt)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!pending.length && (
        <div className="card p-6">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900">En attente de validation</h3>
          <ul className="divide-y divide-ink-300/30">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink-900">{p.member?.firstName} {p.member?.lastName} · {formatFcfa(p.amount)}</p>
                  <p className="text-xs text-ink-500">{formatDate(p.paidAt)} · Réf. {p.paymentRef}</p>
                </div>
                <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => confirmPayment.mutate(p.id)} disabled={confirmPayment.isPending}>
                  Valider &amp; générer le reçu
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6">
        <h3 className="mb-3 font-display text-base font-semibold text-ink-900">Tous les paiements</h3>
        {!payments?.length ? (
          <EmptyState title="Aucun paiement enregistré" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="pb-3">Membre</th>
                  <th className="pb-3">Montant</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/30">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-ink-900">{p.member?.firstName} {p.member?.lastName}</td>
                    <td className={`py-3 ${p.amount < 0 ? 'text-rose-600' : 'text-ink-700'}`}>{formatFcfa(p.amount)}</td>
                    <td className="py-3 text-ink-500">{formatDate(p.paidAt)}</td>
                    <td className="py-3"><PaymentStatusBadge status={p.status} /></td>
                    <td className="py-3 text-right">
                      {p.status === 'VALIDE' && !p.paymentRef.startsWith('RVS') && (
                        <button className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => setReversalTarget(p)}>
                          Contre-passer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordPaymentModal open={recordOpen} onClose={() => setRecordOpen(false)} members={members ?? []} onDone={invalidateAll} />

      <Modal open={!!reversalTarget} onClose={() => setReversalTarget(null)} title="Contre-passer ce paiement" description="L'opération d'origine est conservée ; une contre-passation référencée est créée pour l'annuler.">
        <textarea
          className="input min-h-24"
          placeholder="Motif de la contre-passation (obligatoire pour la traçabilité)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setReversalTarget(null)}>Annuler</button>
          <button className="btn-primary !bg-rose-600 hover:!bg-rose-700" disabled={!reason || reversePayment.isPending} onClick={() => reversePayment.mutate()}>
            {reversePayment.isPending && <Spinner />}
            Confirmer la contre-passation
          </button>
        </div>
      </Modal>
    </div>
  );
}

function RecordPaymentModal({
  open,
  onClose,
  members,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  members: MemberSummary[];
  onDone: () => void;
}) {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');

  const record = useMutation({
    mutationFn: () => api.post('/payments', { memberId, amount, method, note: note || undefined }),
    onSuccess: () => {
      toast.success('Versement enregistré. Il apparaît maintenant en attente de validation.');
      onDone();
      onClose();
      setMemberId('');
      setAmount(500);
      setNote('');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'enregistrement a échoué."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer un versement" description="Le paiement sera d'abord placé en attente, puis validé pour générer le reçu.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          record.mutate();
        }}
      >
        <div>
          <label className="label">Membre</label>
          <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
            <option value="" disabled>Sélectionner un membre</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName} — {m.memberCode}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Montant (FCFA)</label>
            <input type="number" min={1} className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
          </div>
          <div>
            <label className="label">Mode de paiement</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Note (optionnel)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précision utile pour le suivi" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={!memberId || record.isPending}>
            {record.isPending && <Spinner />}
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}
