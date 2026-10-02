/** Onglets en pastilles. Défile horizontalement sur petit écran au lieu de passer à la ligne. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className = 'mb-6',
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; badge?: number }[];
  className?: string;
}) {
  return (
    <div className={`-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${className}`}>
      <div role="tablist" className="inline-flex gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-300/40">
        {items.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              value === t.value ? 'bg-mims-700 text-white' : 'text-ink-700 hover:bg-mims-50'
            }`}
          >
            {t.label}
            {!!t.badge && (
              <span className={`rounded-full px-1.5 text-[11px] ${value === t.value ? 'bg-white/20' : 'bg-rose-100 text-rose-700'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
