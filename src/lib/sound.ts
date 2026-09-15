'use client';

// Les navigateurs bloquent l'audio tant qu'aucune interaction utilisateur n'a eu
// lieu sur la page. On garde un unique AudioContext partagé, débloqué dès le
// premier clic/touche (voir `primeNotificationSound`), puis réutilisé pour
// jouer le carillon de notification sans jamais avoir besoin d'un fichier audio.
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!sharedContext) sharedContext = new AudioCtor();
  return sharedContext;
}

export function primeNotificationSound() {
  getContext()?.resume().catch(() => undefined);
}

/** Petit carillon doux à deux notes, pour signaler l'arrivée d'une notification. */
export function playNotificationChime() {
  const ctx = getContext();
  if (!ctx) return;
  ctx.resume().catch(() => undefined);

  const now = ctx.currentTime;
  const notes: Array<[frequency: number, start: number]> = [
    [880, 0],
    [1318.5, 0.1],
  ];

  for (const [frequency, offset] of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    const start = now + offset;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  }
}
