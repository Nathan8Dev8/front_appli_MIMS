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

// Affiche une vraie notification système, même si l'app n'est pas ouverte —
// c'est le cœur de la fonctionnalité : le membre voit qu'il a une
// notification qui l'attend sans avoir besoin d'ouvrir l'application.
self.addEventListener('push', (event) => {
  let data = { title: 'Jeunes MIMS', body: 'Tu as une nouvelle notification.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore un payload non-JSON
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'jeunes-mims-notification',
      data: { url: data.url || '/notifications' },
    }),
  );
});

// Au clic sur la notification : ramène au premier plan un onglet déjà
// ouvert sur l'app, sinon en ouvre un nouveau sur la page concernée.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
