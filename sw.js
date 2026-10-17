// DUEL service worker: makes the app installable and shows push notifications
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// No offline caching; just let the network handle requests
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let data = { title: 'DUEL', body: 'You have a new update', url: '/' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'duel',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        if ('focus' in client) {
          try {
            await client.navigate(url);
          } catch (e) {}
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
