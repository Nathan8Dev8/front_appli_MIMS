'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { EXPENSE_CATEGORIES, METHODS, todayInputValue } from '@/lib/finance';
import { formatFcfa } from '@/lib/format';
import type { CollecteSummary, TxNature } from '@/lib/types';

export function ExpenseModal({
  open,
  onClose,
  balance,
  collectes,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  collectes: CollecteSummary[];
  initial?: { category?: TxNature; collecteId?: string; amount?: number; label?: string };
}) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<TxNature>('FONCTIONNEMENT');
  const [collecteId, setCollecteId] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [method, setMethod] = useState('CASH');
  const [date, setDate] = useState(todayInputValue());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory(initial?.category ?? 'FONCTIONNEMENT');
    setCollecteId(initial?.collecteId ?? '');
    setAmount(initial?.amount ? String(initial.amount) : '');
    setLabel(initial?.label ?? '');
    setMethod('CASH');
    setDate(todayInputValue());
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const amountNum = Math.floor(Number(amount)) || 0;
  const isRemise = category === 'REMISE_COLLECTE';
  const tooHigh = amountNum > balance;

  const record = useMutation({
    mutationFn: () =>
      api.post('/finance/expenses', {
        amount: amountNum,
        category,
        label: label.trim(),
        method,
        collecteId: collecteId || undefined,
        spentAt: date !== todayInputValue() ? date : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`Sortie de ${formatFcfa(amountNum)} enregistrée ✅`);
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La sortie n'a pas pu être enregistrée."),
  });

  const canSubmit = amountNum > 0 && !tooHigh && label.trim().length >= 3 && (!isRemise || !!collecteId) && !record.isPending;

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer une sortie" description="L'argent sort de la caisse. Note bien le motif pour qu'on sache à quoi il a servi." maxWidth="max-w-xl">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) record.mutate();
        }}
      >
        <div className="flex items-center justify-between rounded-xl bg-mims-50/70 px-4 py-3 text-sm">
          <span className="text-ink-500">Solde disponible en caisse</span>
          <span className="font-display font-semibold text-mims-700">{formatFcfa(balance)}</span>
        </div>

        <div>
          <label className="label">Nature de la sortie</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as TxNature)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">{isRemise ? 'Collecte remise' : 'Collecte liée (optionnel)'}</label>
          <select className="input" value={collecteId} onChange={(e) => setCollecteId(e.target.value)} required={isRemise}>
            <option value="">{isRemise ? 'Choisir une collecte' : 'Aucune'}</option>
            {collectes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · reste {formatFcfa(c.remaining)}{c.status === 'CLOTUREE' ? ' (clôturée)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Motif</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. : Location de la salle, remise aux mariés…" maxLength={200} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Montant (FCFA)</label>
            <input type="number" min={1} step={1} className={`input ${tooHigh ? '!border-rose-400' : ''}`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            {tooHigh && <p className="mt-1.5 text-xs font-medium text-rose-600">Supérieur au solde de la caisse.</p>}
          </div>
          <div>
            <label className="label">Mode</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} max={todayInputValue()} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-ink-500">
            {amountNum > 0 && !tooHigh ? `Solde après sortie : ${formatFcfa(balance - amountNum)}` : ''}
          </p>
          <div className="flex gap-3">
            <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary !bg-rose-600 hover:!bg-rose-700" disabled={!canSubmit}>
              {record.isPending && <Spinner />}
              Enregistrer la sortie
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
