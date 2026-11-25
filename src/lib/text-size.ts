'use client';

/** Mode « gros texte » : agrandit toute l'appli (tout est en rem), réglage propre à cet appareil. */
const KEY = 'mims-gros-texte';

export function readLargeText() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function applyLargeText(on: boolean) {
  document.documentElement.classList.toggle('gros-texte', on);
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible : le réglage vaut pour cette visite seulement
  }
}
