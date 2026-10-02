import type { ComplaintCategory, ComplaintKind, ComplaintStatus } from './types';

export const KIND_LABELS: Record<ComplaintKind, string> = { PLAINTE: '📮 Plainte', SUGGESTION: '💡 Suggestion' };

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  ACTIVITES: '🗓️ Activités et organisation',
  COTISATIONS: '💰 Cotisations et caisse',
  COMPORTEMENT: "🤝 Comportement d'un membre",
  BUREAU: '🏛️ Le bureau',
  AUTRE: '❓ Autre',
};

export const STATUS: Record<ComplaintStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'neutral' }> = {
  RECUE: { label: '📨 Reçue', variant: 'warning' },
  EN_COURS: { label: '🔎 En cours', variant: 'info' },
  RESOLUE: { label: '✅ Résolue', variant: 'success' },
  CLASSEE: { label: '📁 Classée', variant: 'neutral' },
};

export const isOpen = (s: ComplaintStatus) => s === 'RECUE' || s === 'EN_COURS';

/** Même règle que l'API : le Pasteur traite tout, le Président tout sauf « Le bureau ». */
export const HANDLER_ROLES = ['PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];
