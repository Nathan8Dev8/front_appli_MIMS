import { Badge, PaymentStatusBadge } from '@/components/ui/badge';
import { NATURE_LABELS, NATURE_VARIANT, methodLabel } from '@/lib/finance';
import { formatDate, formatFcfa } from '@/lib/format';
import type { TransactionRow } from '@/lib/types';

export function TransactionTable({
  items,
  renderActions,
}: {
  items: TransactionRow[];
  renderActions?: (row: TransactionRow) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-300/30 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <th className="px-5 py-3">Date</th>
            <th className="px-3 py-3">Opération</th>
            <th className="hidden px-3 py-3 md:table-cell">Mode</th>
            <th className="px-3 py-3 text-right">Montant</th>
            <th className="hidden px-3 py-3 sm:table-cell">Statut</th>
            {renderActions && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-300/30">
          {items.map((t) => {
            const inactive = t.status !== 'VALIDE';
            const isEntry = t.direction === 'ENTREE';
            return (
              <tr key={`${t.kind}-${t.id}`} className="transition hover:bg-mims-50/40">
                <td className="whitespace-nowrap px-5 py-3 text-ink-500">{formatDate(t.date)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={NATURE_VARIANT[t.nature]}>{NATURE_LABELS[t.nature]}</Badge>
                    <span className={`font-medium ${inactive ? 'text-ink-500 line-through' : 'text-ink-900'}`}>{t.label}</span>
                  </div>
                  {(t.detail || t.cancelReason) && (
                    <p className="mt-1 text-xs text-ink-500">
                      {t.detail}
                      {t.cancelReason && <span className="text-rose-600">{t.detail ? ' · ' : ''}Annulée : {t.cancelReason}</span>}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-ink-500/70">{t.reference} · saisi par {t.enteredByName}</p>
                </td>
                <td className="hidden px-3 py-3 text-ink-500 md:table-cell">{methodLabel(t.method)}</td>
                <td
                  className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                    inactive ? 'text-ink-500 line-through' : isEntry ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isEntry ? '+' : '−'} {formatFcfa(t.amount)}
                </td>
                <td className="hidden px-3 py-3 sm:table-cell"><PaymentStatusBadge status={t.status} /></td>
                {renderActions && <td className="whitespace-nowrap px-5 py-3 text-right">{renderActions(t)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
