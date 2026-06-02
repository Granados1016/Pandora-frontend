// ── Pandora Service Worker — Push Notifications ───────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

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
