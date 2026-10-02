import { AlertIcon, ArrowDownLeftIcon, ArrowRightIcon, ArrowUpRightIcon, WalletIcon } from '@/components/ui/icons';
import { formatFcfa, formatMonth } from '@/lib/format';
import type { CashSummary } from '@/lib/types';

/** Les deux chiffres clés de la trésorerie : le solde en caisse et le total des arriérés. */
export function CashHero({ summary, onSeeDebtors }: { summary?: CashSummary; onSeeDebtors: () => void }) {
  const balance = summary?.balance ?? 0;
  const arrears = summary?.arrears.total ?? 0;
  const debtors = summary?.arrears.debtors ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl bg-mims-gradient p-6 text-white shadow-card lg:col-span-3">
          <WalletIcon width={150} height={150} className="pointer-events-none absolute -right-6 -top-6 text-white/[0.07]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-mims-100">Solde en caisse</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{summary ? formatFcfa(balance) : '—'}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-200">
              <ArrowDownLeftIcon width={16} height={16} />
              <span className="text-mims-100">Entrées du mois</span> <strong className="text-white">{formatFcfa(summary?.monthEntries ?? 0)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-rose-200">
              <ArrowUpRightIcon width={16} height={16} />
              <span className="text-mims-100">Sorties du mois</span> <strong className="text-white">{formatFcfa(summary?.monthExits ?? 0)}</strong>
            </span>
          </div>
          {!!summary?.earmarkedForCollectes && (
            <p className="mt-4 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              dont {formatFcfa(summary.earmarkedForCollectes)} de collectes à remettre
            </p>
          )}
        </div>

        <div className={`flex flex-col justify-between rounded-2xl border-l-4 bg-white p-6 shadow-card lg:col-span-2 ${arrears > 0 ? 'border-rose-500' : 'border-emerald-500'}`}>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              <AlertIcon width={16} height={16} className={arrears > 0 ? 'text-rose-500' : 'text-emerald-500'} />
              Total des arriérés
            </p>
            <p className={`mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl ${arrears > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {summary ? formatFcfa(arrears) : '—'}
            </p>
            <p className="mt-2 text-sm text-ink-500">
              {arrears > 0
                ? `${debtors} membre${debtors > 1 ? 's' : ''} en retard de cotisation`
                : 'Tout le monde est à jour ✅'}
              {summary && <span className="capitalize"> · {formatMonth(summary.currentMonth)}</span>}
            </p>
          </div>
          {arrears > 0 && (
            <button onClick={onSeeDebtors} className="mt-4 flex items-center gap-1.5 self-start text-sm font-semibold text-rose-600 hover:text-rose-700">
              Voir les membres concernés <ArrowRightIcon width={16} height={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
