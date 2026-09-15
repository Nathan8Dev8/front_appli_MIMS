import type { ComponentType, SVGProps } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: 'default' | 'warning' | 'success';
}) {
  const toneClasses = {
    default: 'bg-mims-50 text-mims-700',
    warning: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-emerald-600',
  } as const;

  return (
    <div className="card animate-fade-up p-5 hover:-translate-y-0.5 hover:shadow-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.03] ${toneClasses[tone]}`}>
          <Icon width={20} height={20} />
        </div>
      </div>
    </div>
  );
}
