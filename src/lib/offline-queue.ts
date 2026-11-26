'use client';

/**
 * File d'attente hors ligne (comme l'horloge 🕓 de WhatsApp) : une action faite
 * sans réseau est rangée ici sur le téléphone, puis envoyée dans l'ordre dès que
 * la connexion revient. Chaque action garde sa clé unique (Idempotency-Key) : un
 * renvoi après coupure ne crée jamais de doublon côté serveur, qui reste l'arbitre.
 */

export interface QueuedAction {
  key: string;
  method: string;
  path: string;
  body?: string;
  /** Ce que la personne voit : « Encaissement 500 F — Samuel Kodjo ». */
  label: string;
  /** Seul ce membre peut envoyer l'action (téléphone partagé). */
  memberId: string;
  createdAt: number;
}

export interface FailedAction {
  label: string;
  message: string;
  at: number;
}

const QUEUE_KEY = 'jeunes-mims-outbox';
const FAILED_KEY = 'jeunes-mims-outbox-failed';

/** Réponse d'une action mise en file au lieu d'être envoyée. */
export const QUEUED = { queued: true } as const;
export function isQueued(res: unknown): boolean {
  return !!res && typeof res === 'object' && (res as { queued?: boolean }).queued === true;
}

function read<T>(name: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(name) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function write(name: string, items: unknown[]) {
  try {
    localStorage.setItem(name, JSON.stringify(items));
  } catch {
    // stockage plein ou bloqué : l'action reste au moins en mémoire de cette page
  }
  window.dispatchEvent(new Event('outbox-change'));
}

export const outbox = {
  list: () => read<QueuedAction>(QUEUE_KEY),
  failed: () => read<FailedAction>(FAILED_KEY),
  add: (action: QueuedAction) => write(QUEUE_KEY, [...outbox.list(), action]),
  remove: (key: string) => write(QUEUE_KEY, outbox.list().filter((a) => a.key !== key)),
  fail: (action: QueuedAction, message: string) => {
    outbox.remove(action.key);
    write(FAILED_KEY, [...outbox.failed(), { label: action.label, message, at: Date.now() }]);
  },
  clearFailed: () => write(FAILED_KEY, []),
};

export function newKey() {
  return crypto.randomUUID();
}
