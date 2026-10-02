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
  if (!sharedContext) sharedContext = new AudioCtor();
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

export async function playNotificationChime() {
  const ctx = getContext();
  if (!ctx) return;
  await ctx.resume().catch(() => undefined);
  const buffer = await loadSound(ctx);
  if (!buffer) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}
