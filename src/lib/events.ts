import type { AppEvent, EventKind } from './types';

export const ORGANIZER_ROLES = ['SECRETAIRE', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];
/** Publier un PV = même droit que publier un document. */
export const DOCUMENT_MANAGER_ROLES = ['SECRETAIRE', 'PRESIDENT_ADMIN'];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  ASSISE: 'Assise',
  ACTIVITE: 'Activité',
  AUTRE: 'Autre',
};

export const isPast = (e: AppEvent) => new Date(e.startsAt) < new Date();
export const isCancelled = (e: AppEvent) => e.status === 'ANNULE';

export function eventStats(e: AppEvent, meId?: string) {
  const ps = e.participations ?? [];
  return {
    mine: ps.find((p) => p.memberId === meId)?.response,
    coming: ps.filter((p) => p.response === 'PRESENT').length,
    notComing: ps.filter((p) => p.response === 'ABSENT').length,
    attended: ps.filter((p) => p.attended).length,
    attendanceTaken: ps.some((p) => p.attended !== null),
  };
}

/** Ce qu'il manque au compte rendu d'un événement passé (vide = complet). */
export function missingReport(e: AppEvent): string[] {
  if (!isPast(e) || isCancelled(e)) return [];
  const missing: string[] = [];
  if (!eventStats(e).attendanceTaken) missing.push('présences');
  if (!e.decisions) missing.push('décisions');
  if (e.kind === 'ASSISE' && !e.reportDocument) missing.push('PV');
  return missing;
}

/** Valeur pour un <input type="datetime-local"> à l'heure locale. */
export function toLocalInput(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
