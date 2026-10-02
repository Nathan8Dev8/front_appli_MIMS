'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { SearchIcon } from '@/components/ui/icons';
import { foldText } from '@/lib/finance';

interface PickableMember {
  id: string;
  firstName: string;
  lastName: string;
  memberCode: string;
  avatarUrl?: string | null;
}

/** Sélecteur de membre avec recherche (nom, prénom ou code), sans accent ni casse. */
export function MemberPicker({
  members,
  value,
  onChange,
}: {
  members: PickableMember[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const selected = members.find((m) => m.id === value);

  const results = useMemo(() => {
    const tokens = foldText(query).split(/\s+/).filter(Boolean);
    const pool = tokens.length
      ? members.filter((m) => {
          const hay = foldText(`${m.firstName} ${m.lastName} ${m.memberCode}`);
          return tokens.every((t) => hay.includes(t));
        })
      : members;
    return pool.slice(0, 8);
  }, [members, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-mims-200 bg-mims-50/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar firstName={selected.firstName} lastName={selected.lastName} avatarUrl={selected.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{selected.firstName} {selected.lastName}</p>
            <p className="text-xs text-ink-500">{selected.memberCode}</p>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-mims-700 hover:text-mims-800"
          onClick={() => {
            onChange('');
            setQuery('');
          }}
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
      <input
        className="input !pl-10"
        placeholder="Rechercher un membre (nom, prénom, code)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      {focused && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-white p-1 shadow-lift ring-1 ring-black/5" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-ink-500">Aucun membre trouvé.</li>
          ) : (
            results.map((m) => (
              <li key={m.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  // onMouseDown : la sélection doit avoir lieu avant que l'input perde le focus et ferme la liste.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(m.id);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-mims-50"
                >
                  <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-900">{m.firstName} {m.lastName}</span>
                    <span className="block text-xs text-ink-500">{m.memberCode}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
