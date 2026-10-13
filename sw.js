// Minimal service worker: makes Duel installable. It does not cache anything,
// so new deployments always show up immediately.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // Only page loads get a friendly offline message; everything else is untouched
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:48px 20px"><h2>You are offline</h2><p>Check your connection and reopen Duel.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    )
  );
});
