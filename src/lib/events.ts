import type { AppEvent, EventKind, EventRepeat } from './types';

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
  if (e.kind === 'ASSISE' && !e.reportDocument) missing.push('rapport');
  return missing;
}

/** Valeur pour un <input type="datetime-local"> à l'heure locale. */
export function toLocalInput(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// ——— Événements récurrents (mêmes règles que l'API, recurrence.ts) ———

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const ORDINALS: Record<number, string> = { 1: 'premier', 2: 'deuxième', 3: 'troisième', 4: 'quatrième', [-1]: 'dernier' };

/** « chaque dernier vendredi du mois » (+ « à 22h00 » si l'heure est donnée). */
export function describeRepeat(r: EventRepeat, time?: string) {
  const at = time ? ` à ${time.replace(':', 'h')}` : '';
  if (r.frequency === 'WEEKLY') return `chaque ${WEEKDAYS[r.weekday!]}${at}`;
  if (r.frequency === 'MONTHLY_NTH') return `chaque ${ORDINALS[r.nth!]} ${WEEKDAYS[r.weekday!]} du mois${at}`;
  return `chaque mois le ${r.monthDay === 1 ? '1er' : r.monthDay}${at}`;
}

/** Les répétitions possibles à partir de la première date choisie (comme Google Agenda). */
export function repeatOptions(date: Date): EventRepeat[] {
  const weekday = date.getDay();
  const day = date.getDate();
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const nth = Math.ceil(day / 7);
  const options: EventRepeat[] = [{ frequency: 'WEEKLY', weekday }];
  if (nth <= 4) options.push({ frequency: 'MONTHLY_NTH', weekday, nth });
  if (day + 7 > last) options.push({ frequency: 'MONTHLY_NTH', weekday, nth: -1 });
  options.push({ frequency: 'MONTHLY_DAY', monthDay: day });
  return options;
}
