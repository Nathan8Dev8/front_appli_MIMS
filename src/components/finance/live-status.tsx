'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

/** « Mis à jour à 14:32 » + bouton pour actualiser tout de suite. */
export function LiveStatus({
  updatedAt,
  fetching,
  onRefresh,
  className = '',
}: {
  updatedAt: number;
  fetching: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  // Sans ce tick, « il y a X s » resterait figé entre deux rafraîchissements.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  const seconds = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;
  const ago = seconds === null ? '' : seconds < 45 ? "à l'instant" : `il y a ${Math.round(seconds / 60) || 1} min`;

  return (
    <div className={`flex items-center gap-2 text-xs text-ink-500 ${className}`}>
      {fetching ? <Spinner className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-emerald-500" />}
      <span>{fetching ? 'Mise à jour…' : ago ? `Actualisé ${ago}` : ''}</span>
      <button className="font-semibold text-mims-700 hover:text-mims-800" onClick={onRefresh}>Actualiser</button>
    </div>
  );
}
