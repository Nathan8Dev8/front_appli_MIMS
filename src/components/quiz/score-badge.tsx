/** Ceux qui préparent les quiz, voient tous les résultats et reçoivent les rappels (même liste que l'API). */
export const QUIZ_MANAGER_ROLES = ['SECRETAIRE', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];

export function ScoreBadge({ score, total }: { score: number; total: number }) {
  const perfect = total > 0 && score === total;
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${perfect ? 'bg-gold-100 text-ink-900' : 'bg-mims-50 text-mims-800'}`}>
      {perfect && '⭐ '}
      {score}/{total}
    </span>
  );
}
