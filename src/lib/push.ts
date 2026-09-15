'use client';

import { api } from './api-client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushSupportState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getPushSupportState(): PushSupportState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushSupportState;
}

// Les clés VAPID sont transmises en base64url ; l'API PushManager attend un Uint8Array.
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function enablePushNotifications(): Promise<{ success: boolean; reason?: string }> {
  if (getPushSupportState() === 'unsupported') return { success: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { success: false, reason: 'not-configured' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, reason: permission };

    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const json = subscription.toJSON();
    await api.post('/push/subscribe', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });

    return { success: true };
  } catch (err) {
    // Ne jamais laisser une exception non gérée remonter jusqu'à l'appelant :
    // le bouton doit toujours pouvoir afficher un message, même en cas de
    // souci réseau ou d'API push indisponible.
    console.error('[push] échec de l\'activation des notifications :', err);
    return { success: false, reason: 'error' };
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (getPushSupportState() === 'unsupported') return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.del('/push/subscribe', { endpoint }).catch(() => undefined);
}

export async function isPushSubscribed(): Promise<boolean> {
  if (getPushSupportState() === 'unsupported') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
