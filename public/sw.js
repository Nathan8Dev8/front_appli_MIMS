const CACHE_NAME = 'jeunes-mims-shell-v1';
const APP_SHELL = ['/', '/logo.png', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Stratégie : réseau d'abord pour l'API et la navigation, repli sur le cache hors-ligne.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  );
});

// Affiche une vraie notification système, même si l'app est fermée (comme un
// mail ou un message). Appli ouverte à l'écran : c'est elle qui joue le son des
// Jeunes MIMS (playSound), la notification système reste muette pour ne pas
// imposer le son du téléphone. Appli fermée : le navigateur ne permet pas de
// choisir le son, c'est celui des notifications du téléphone.
self.addEventListener('push', (event) => {
  let data = { title: 'Jeunes MIMS', body: 'Tu as une nouvelle notification.', url: '/notifications' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore un payload non-JSON
  }

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const appVisible = windows.some((c) => c.visibilityState === 'visible');
      windows.forEach((c) => c.postMessage({ type: 'push', notification: data, playSound: c.visibilityState === 'visible' }));

      // Pastille avec le nombre de non lus sur l'icône de l'appli installée.
      if (typeof data.unread === 'number' && self.navigator.setAppBadge) {
        await self.navigator.setAppBadge(data.unread).catch(() => undefined);
      }

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: data.id || undefined, // une notification par message : elles ne s'écrasent plus
        renotify: Boolean(data.id),
        timestamp: Date.now(),
        silent: appVisible,
        vibrate: [120, 60, 120, 60, 260], // signature de vibration (Android)
        data: { url: data.url || '/notifications', id: data.id },
      });
    })(),
  );
});

// Au toucher : si l'appli est déjà ouverte, on la ramène au premier plan et on lui
// demande d'aller sur la page concernée (client.navigate échoue sur iPhone et sur
// un onglet pas encore contrôlé) ; sinon on l'ouvre directement sur cette page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url = '/notifications', id } = event.notification.data || {};

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus().catch(() => undefined);
        client.postMessage({ type: 'navigate', url, id });
        return;
      }
      // ?notif=… permet à l'appli de marquer la notification comme lue à l'ouverture.
      await clients.openWindow(id ? `${url}${url.includes('?') ? '&' : '?'}notif=${id}` : url);
    })(),
  );
});
