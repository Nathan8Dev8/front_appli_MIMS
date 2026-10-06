'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { MemberPicker } from '@/components/finance/member-picker';
import { useDebounced } from '@/hooks/use-debounced';
import { METHODS, MONTHLY_DUE, REGISTRATION_FEE, todayInputValue } from '@/lib/finance';
import { formatFcfa } from '@/lib/format';
import type { CollecteSummary, CotisationPreview, MemberFinanceRow } from '@/lib/types';

export type EntryNature = 'COTISATION' | 'INSCRIPTION' | 'COLLECTE';

const NATURES: { value: EntryNature; label: string; hint: string }[] = [
  { value: 'COTISATION', label: 'Cotisation mensuelle', hint: `${MONTHLY_DUE} F / mois` },
  { value: 'INSCRIPTION', label: 'Inscription', hint: `${REGISTRATION_FEE.toLocaleString('fr-FR')} F` },
  { value: 'COLLECTE', label: 'Collecte', hint: 'Mariage, naissance, deuil…' },
];

const KIND_LABEL = { MOIS_EN_COURS: 'Mois en cours', ARRIERE: 'Dette', AVANCE: 'Avance' } as const;
const KIND_VARIANT = { MOIS_EN_COURS: 'info', ARRIERE: 'warning', AVANCE: 'success' } as const;

export function EntryModal({
  open,
  onClose,
  members,
  collectes,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  members: MemberFinanceRow[];
  collectes: CollecteSummary[];
  initial?: { nature?: EntryNature; memberId?: string; collecteId?: string };
}) {
  const queryClient = useQueryClient();
  const [nature, setNature] = useState<EntryNature>('COTISATION');
  const [memberId, setMemberId] = useState('');
  const [collecteId, setCollecteId] = useState('');
  const [amount, setAmount] = useState(String(MONTHLY_DUE));
  const [method, setMethod] = useState('CASH');
  const [date, setDate] = useState(todayInputValue());
  const [note, setNote] = useState('');

  const openCollectes = collectes.filter((c) => c.status === 'OUVERTE');

  useEffect(() => {
    if (!open) return;
    const start = initial?.nature ?? 'COTISATION';
    setNature(start);
    setMemberId(initial?.memberId ?? '');
    setCollecteId(initial?.collecteId ?? '');
    setAmount(start === 'INSCRIPTION' ? String(REGISTRATION_FEE) : start === 'COTISATION' ? String(MONTHLY_DUE) : '');
    setMethod('CASH');
    setDate(todayInputValue());
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function chooseNature(next: EntryNature) {
    setNature(next);
    setAmount(next === 'INSCRIPTION' ? String(REGISTRATION_FEE) : next === 'COTISATION' ? String(MONTHLY_DUE) : '');
  }

  const amountNum = Math.floor(Number(amount)) || 0;
  const debouncedAmount = useDebounced(amountNum);
  const member = members.find((m) => m.id === memberId);
  const paidAtParam = date && date !== todayInputValue() ? `&paidAt=${date}` : '';

  const { data: preview, error: previewError, isFetching: previewLoading } = useQuery({
    queryKey: ['finance', 'preview', memberId, debouncedAmount, date],
    queryFn: () =>
      api.get<CotisationPreview>(`/finance/cotisation-preview?memberId=${memberId}&amount=${debouncedAmount}${paidAtParam}`),
    enabled: open && nature === 'COTISATION' && !!memberId && debouncedAmount > 0,
    retry: false,
  });
  const previewMessage = previewError instanceof ApiError ? previewError.message : null;

  const record = useMutation({
    mutationFn: () =>
      api.post<{ receipt: unknown }>('/payments', {
        memberId,
        amount: amountNum,
        method,
        nature,
        collecteId: nature === 'COLLECTE' ? collecteId : undefined,
        paidAt: paidAtParam ? date : undefined,
        note: note.trim() || undefined,
        autoConfirm: true,
      }),
    onSuccess: (res) => {
      if (res?.receipt) toast.success(`${formatFcfa(amountNum)} encaissés, reçu envoyé à ${member?.firstName ?? 'le membre'} ✅`);
      else toast(`${formatFcfa(amountNum)} encaissés, mais le reçu n'a pas pu être créé. Régénère-le depuis Transactions.`, { icon: '⚠️', duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dues'] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "L'entrée n'a pas pu être enregistrée."),
  });

  const alreadyRegistered = nature === 'INSCRIPTION' && !!member?.inscriptionPaid;
  const canSubmit =
    !!memberId && amountNum > 0 && !alreadyRegistered && (nature !== 'COLLECTE' || !!collecteId) && !previewMessage && !record.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enregistrer une entrée"
      description="L'argent est ajouté à la caisse et le membre reçoit son reçu."
      maxWidth="max-w-xl"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) record.mutate();
        }}
      >
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-mist-200 p-1">
          {NATURES.map((n) => (
            <button
              key={n.value}
              type="button"
              onClick={() => chooseNature(n.value)}
              className={`rounded-xl px-2 py-2 text-center transition ${nature === n.value ? 'bg-white shadow-soft' : 'hover:bg-white/60'}`}
            >
              <span className={`block text-xs font-semibold sm:text-sm ${nature === n.value ? 'text-mims-700' : 'text-ink-700'}`}>{n.label}</span>
              <span className="block text-[11px] text-ink-500">{n.hint}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="label">Membre</label>
          <MemberPicker members={members} value={memberId} onChange={setMemberId} />
          {member && nature === 'COTISATION' && (
            <p className="mt-1.5 text-xs text-ink-500">
              {member.totalDebt > 0
                ? `Dette actuelle : ${formatFcfa(member.totalDebt)} (${member.monthsLate} mois)`
                : member.advanceMonths > 0
                  ? `À jour, avec ${member.advanceMonths} mois d'avance`
                  : 'À jour'}
            </p>
          )}
          {alreadyRegistered && <p className="mt-1.5 text-xs font-medium text-rose-600">Les frais d'inscription de ce membre sont déjà enregistrés.</p>}
        </div>

        {nature === 'COLLECTE' && (
          <div>
            <label className="label">Collecte concernée</label>
            {openCollectes.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Aucune collecte ouverte. Crée-en une depuis l'onglet « Collectes ».
              </p>
            ) : (
              <select className="input" value={collecteId} onChange={(e) => setCollecteId(e.target.value)} required>
                <option value="" disabled>Choisir une collecte</option>
                {openCollectes.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}{c.beneficiary ? ` · ${c.beneficiary}` : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Montant reçu (FCFA)</label>
            <input type="number" min={1} step={1} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mode de paiement</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {nature === 'COTISATION' && memberId && amountNum > 0 && (
          <div className="rounded-xl bg-mims-50/70 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mims-700">
              Répartition de ce versement {previewLoading && <Spinner className="h-3 w-3" />}
            </p>
            {previewMessage ? (
              <p className="text-sm font-medium text-rose-600">{previewMessage}</p>
            ) : preview ? (
              <>
                <ul className="space-y-1.5">
                  {preview.steps.map((s) => (
                    <li key={s.month} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-medium capitalize text-ink-900">{s.label}</span>
                        <Badge variant={KIND_VARIANT[s.kind]}>{KIND_LABEL[s.kind]}</Badge>
                      </span>
                      <span className="text-right">
                        <span className="font-semibold text-ink-900">{formatFcfa(s.amount)}</span>
                        {s.balanceAfter > 0 && (
                          <span className="block text-xs text-amber-600">reste {formatFcfa(s.balanceAfter)} à payer</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-mims-100 pt-2.5 text-sm">
                  <span className="text-ink-500">Dette du membre</span>
                  <span className="font-semibold">
                    {formatFcfa(preview.debtBefore)} → <span className={preview.debtAfter > 0 ? 'text-amber-600' : 'text-emerald-600'}>{formatFcfa(preview.debtAfter)}</span>
                  </span>
                </div>
              </>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date du versement</label>
            <input type="date" className="input" value={date} max={todayInputValue()} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précision utile" maxLength={500} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {record.isPending && <Spinner />}
            Enregistrer {amountNum > 0 ? formatFcfa(amountNum) : ''}
          </button>
        </div>
      </form>
    </Modal>
  );
}
