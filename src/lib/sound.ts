'use client';

/**
 * Son de notification propre aux Jeunes MIMS (public/sounds/notification.mp3).
 * Les navigateurs bloquent l'audio tant que l'utilisateur n'a pas touché la page :
 * on débloque un AudioContext partagé au premier clic (`primeNotificationSound`),
 * puis on rejoue le son décodé une fois pour toutes.
 */
const SOUND_URL = '/sounds/notification.mp3';

let sharedContext: AudioContext | null = null;
let soundBuffer: Promise<AudioBuffer | null> | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  // Un contexte fermé (ex. iOS après une longue mise en veille) ne rejouera plus rien : on en recrée un.
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AudioCtor();
    soundBuffer = null;
  }
  return sharedContext;
}

function loadSound(ctx: AudioContext) {
  soundBuffer ??= fetch(SOUND_URL)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .catch(() => {
      soundBuffer = null; // nouvel essai au prochain appel
      return null;
    });
  return soundBuffer;
}

export function primeNotificationSound() {
  const ctx = getContext();
  if (!ctx) return;
  ctx.resume().catch(() => undefined);
  loadSound(ctx);
}

/** Joue le son ; renvoie false si le navigateur l'a bloqué (pour sonner autrement, voir topbar). */
export async function playNotificationChime(): Promise<boolean> {
  const ctx = getContext();
  if (ctx) await ctx.resume().catch(() => undefined);
  const buffer = ctx ? await loadSound(ctx) : null;
  // Contexte resté en pause (appli revenue de l'arrière-plan…) : simple lecteur audio en secours.
  if (!ctx || !buffer || ctx.state !== 'running') {
    return new Audio(SOUND_URL).play().then(() => true, () => false);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return true;
}
