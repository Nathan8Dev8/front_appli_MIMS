'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { HeartIcon, PlusIcon } from '@/components/ui/icons';
import { COLLECTE_KINDS, collecteKindLabel, methodLabel } from '@/lib/finance';
import { formatDate, formatFcfa } from '@/lib/format';
import type { CollecteDetail, CollecteKind, CollecteSummary } from '@/lib/types';

export function CollectesPanel({
  collectes,
  onContribute,
  onRemit,
}: {
  collectes: CollecteSummary[];
  onContribute: (c: CollecteSummary) => void;
  onRemit: (c: CollecteSummary) => void;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [closing, setClosing] = useState<CollecteSummary | null>(null);

  const visible = collectes.filter((c) => showClosed || c.status === 'OUVERTE');
  const closedCount = collectes.filter((c) => c.status === 'CLOTUREE').length;

  const close = useMutation({
    mutationFn: (id: string) => api.post(`/finance/collectes/${id}/close`),
    onSuccess: () => {
      toast.success('Collecte clôturée ✅');
      setClosing(null);
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La collecte n'a pas pu être clôturée."),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-500">
          Une collecte sert à réunir l'argent des membres pour un mariage, une naissance ou un deuil. L'argent reste en caisse
          jusqu'à ce qu'on le remette à la personne concernée.
        </p>
        <div className="flex items-center gap-3">
          {closedCount > 0 && (
            <button className="text-sm font-semibold text-mims-700 hover:text-mims-800" onClick={() => setShowClosed((v) => !v)}>
              {showClosed ? 'Masquer les clôturées' : `Voir les clôturées (${closedCount})`}
            </button>
          )}
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon width={16} height={16} /> Nouvelle collecte
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<HeartIcon />}
          title="Aucune collecte en cours"
          description="Ouvre une collecte pour récolter l'argent des membres à l'occasion d'un mariage, d'une naissance ou d'un deuil."
          action={<button className="btn-primary" onClick={() => setCreateOpen(true)}>Créer une collecte</button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((c) => {
            const pct = c.collected > 0 ? Math.min(100, Math.round((c.remitted / c.collected) * 100)) : 0;
            const open = c.status === 'OUVERTE';
            return (
              <div key={c.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink-900">{c.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {collecteKindLabel(c.kind)}{c.beneficiary ? ` · ${c.beneficiary}` : ''} · ouverte le {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <Badge variant={open ? 'success' : 'neutral'}>{open ? 'Ouverte' : 'Clôturée'}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Figure label="Collecté" value={c.collected} sub={`${c.contributors} contributeur${c.contributors > 1 ? 's' : ''}`} />
                  <Figure label="Remis" value={c.remitted} />
                  <Figure label="À remettre" value={Math.max(c.remaining, 0)} highlight={c.remaining > 0} />
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist-300">
                  <div className="h-full rounded-full bg-mims-600 transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {open && (
                    <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => onContribute(c)}>Enregistrer une contribution</button>
                  )}
                  {c.remaining > 0 && (
                    <button className="btn-secondary !px-4 !py-2 text-xs" onClick={() => onRemit(c)}>Remettre {formatFcfa(c.remaining)}</button>
                  )}
                  <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setDetailId(c.id)}>Détails</button>
                  {open && (
                    <button className="ml-auto text-xs font-semibold text-ink-500 hover:text-rose-600" onClick={() => setClosing(c)}>Clôturer</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateCollecteModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <CollecteDetailModal id={detailId} onClose={() => setDetailId(null)} />

      <Modal
        open={!!closing}
        onClose={() => setClosing(null)}
        title="Clôturer cette collecte ?"
        description="Une fois clôturée, on ne peut plus y ajouter de contribution. Ce qui est déjà noté reste visible."
      >
        {closing && closing.remaining > 0 && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Attention, il reste {formatFcfa(closing.remaining)} à remettre. Note d'abord la remise si ce n'est pas fait.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setClosing(null)}>Annuler</button>
          <button className="btn-primary" disabled={close.isPending} onClick={() => closing && close.mutate(closing.id)}>
            {close.isPending && <Spinner />} Clôturer
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Figure({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-2.5 ${highlight ? 'bg-amber-50' : 'bg-mist-100'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 font-display text-sm font-semibold sm:text-base ${highlight ? 'text-amber-700' : 'text-ink-900'}`}>{formatFcfa(value)}</p>
      {sub && <p className="text-[10px] text-ink-500">{sub}</p>}
    </div>
  );
}

function CreateCollecteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CollecteKind>('MARIAGE');
  const [beneficiary, setBeneficiary] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.post('/finance/collectes', {
        title: title.trim(),
        kind,
        beneficiary: beneficiary.trim() || undefined,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Collecte créée ✅ Tu peux maintenant noter les contributions.');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      setTitle('');
      setBeneficiary('');
      setDescription('');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La collecte n'a pas pu être créée."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle collecte" description="Pour un événement de la vie d'un membre ou de sa famille.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <label className="label">Type d'événement</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as CollecteKind)}>
            {COLLECTE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Intitulé</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Mariage de Grâce et Paul" minLength={3} maxLength={120} required />
        </div>
        <div>
          <label className="label">Personne concernée (optionnel)</label>
          <input className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Ex. : Famille Amoussou" maxLength={120} />
        </div>
        <div>
          <label className="label">Précisions (optionnel)</label>
          <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={title.trim().length < 3 || create.isPending}>
            {create.isPending && <Spinner />} Créer la collecte
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CollecteDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'collecte', id],
    queryFn: () => api.get<CollecteDetail>(`/finance/collectes/${id}`),
    enabled: !!id,
  });

  return (
    <Modal open={!!id} onClose={onClose} title={data?.title ?? 'Détails de la collecte'} description={data ? `${collecteKindLabel(data.kind)}${data.beneficiary ? ` · ${data.beneficiary}` : ''}` : undefined} maxWidth="max-w-xl">
      {isLoading || !data ? (
        <div className="flex justify-center py-8 text-mims-700"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Contributions ({data.contributions.length})</h3>
            {data.contributions.length === 0 ? (
              <p className="text-sm text-ink-500">Aucune contribution pour le moment.</p>
            ) : (
              <ul className="max-h-56 divide-y divide-ink-300/30 overflow-y-auto">
                {data.contributions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span><span className="font-medium text-ink-900">{c.memberName}</span> <span className="text-xs text-ink-500">· {formatDate(c.paidAt)} · {methodLabel(c.method)}</span></span>
                    <span className="font-semibold text-emerald-600">{formatFcfa(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Remises ({data.remittances.length})</h3>
            {data.remittances.length === 0 ? (
              <p className="text-sm text-ink-500">Rien n'a encore été remis.</p>
            ) : (
              <ul className="divide-y divide-ink-300/30">
                {data.remittances.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span><span className="font-medium text-ink-900">{r.label}</span> <span className="text-xs text-ink-500">· {formatDate(r.spentAt)}</span></span>
                    <span className="font-semibold text-rose-600">−{formatFcfa(r.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-between rounded-xl bg-mims-50/70 px-4 py-3 text-sm">
            <span className="text-ink-500">Reste à remettre</span>
            <span className="font-display font-semibold text-mims-700">{formatFcfa(Math.max(data.remaining, 0))}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
