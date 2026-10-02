import type { CollecteKind, TxNature } from '@/lib/types';

export const NATURE_LABELS: Record<TxNature, string> = {
  INSCRIPTION: 'Inscription',
  COTISATION: 'Cotisation',
  COLLECTE: 'Collecte',
  REMISE_COLLECTE: 'Remise de collecte',
  FONCTIONNEMENT: 'Fonctionnement',
  ACTIVITE: 'Activité / événement',
  AUTRE_DEPENSE: 'Autre dépense',
};

export const ENTRY_NATURES: TxNature[] = ['INSCRIPTION', 'COTISATION', 'COLLECTE'];
export const EXIT_NATURES: TxNature[] = ['REMISE_COLLECTE', 'FONCTIONNEMENT', 'ACTIVITE', 'AUTRE_DEPENSE'];

export const NATURE_VARIANT: Record<TxNature, 'info' | 'success' | 'gold' | 'danger' | 'warning' | 'neutral'> = {
  INSCRIPTION: 'gold',
  COTISATION: 'info',
  COLLECTE: 'success',
  REMISE_COLLECTE: 'danger',
  FONCTIONNEMENT: 'warning',
  ACTIVITE: 'warning',
  AUTRE_DEPENSE: 'neutral',
};

export const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'AUTRE', label: 'Autre' },
];

export const methodLabel = (method: string) => METHODS.find((m) => m.value === method)?.label ?? method;

export const COLLECTE_KINDS: { value: CollecteKind; label: string }[] = [
  { value: 'MARIAGE', label: 'Mariage' },
  { value: 'NAISSANCE', label: 'Naissance (voir bébé)' },
  { value: 'DECES', label: 'Deuil' },
  { value: 'AUTRE', label: 'Autre événement' },
];

export const collecteKindLabel = (kind: CollecteKind) => COLLECTE_KINDS.find((k) => k.value === kind)?.label ?? kind;

export const EXPENSE_CATEGORIES: { value: TxNature; label: string }[] = [
  { value: 'REMISE_COLLECTE', label: 'Remise d’une collecte' },
  { value: 'FONCTIONNEMENT', label: 'Fonctionnement du groupe' },
  { value: 'ACTIVITE', label: 'Activité / événement' },
  { value: 'AUTRE_DEPENSE', label: 'Autre dépense' },
];

export const REGISTRATION_FEE = 1000;
export const MONTHLY_DUE = 500;

/** Date du jour au format AAAA-MM-JJ, en heure locale (pour <input type="date">). */
export function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minuscules sans accents, pour une recherche tolérante (« grace » trouve « Grâce »). */
export function foldText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Les chiffres de la caisse se remettent à jour tout seuls à cette fréquence (page ouverte et visible). */
export const LIVE_REFRESH_MS = 30_000;

/** Prochain jour de cotisation : le 2e dimanche du mois (même règle que l'API). */
export function nextCotisationSunday(now = new Date()) {
  const secondSunday = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    return new Date(year, month, 1 + ((7 - first.getDay()) % 7) + 7);
  };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = secondSunday(now.getFullYear(), now.getMonth());
  return thisMonth >= today ? thisMonth : secondSunday(now.getFullYear(), now.getMonth() + 1);
}
