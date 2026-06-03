// ── Pandora Service Worker — Push Notifications + PWA Cache ──────────────────
const CACHE_NAME = 'pandora-v1';
const OFFLINE_ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(OFFLINE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => e.waitUntil(
  Promise.all([
    self.clients.claim(),
    // Eliminar cachés viejos
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )),
  ])
));

// Network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return; // no cachear API

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Pandora', body: event.data.text() }; }

  const title   = data.title  ?? 'Pandora';
  const options = {
    body:    data.body  ?? '',
    icon:    data.icon  ?? '/vite.svg',
    badge:   data.badge ?? '/vite.svg',
    tag:     data.tag   ?? 'pandora-notif',
    data:    { url: data.url ?? '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si ya hay una ventana abierta, navegar ahí
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Si no, abrir nueva ventana
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
