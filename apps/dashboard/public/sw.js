// Sentinel service worker.
// Deliberately minimal: the dashboard is live data, so nothing is cached except
// an offline fallback page. Also receives Web Push alerts sent by the checker.

const CACHE = 'sentinel-shell-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((res) => res ?? Response.error()),
    ),
  );
});

// ── Push alerts ──────────────────────────────────────────────────────────────
// Payload (from apps/checker/src/notifications/push.ts): { title, body, url, tag }

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Sentinel', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Sentinel';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      icon: '/icon/192',
      badge: '/icon/192',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (new URL(win.url).origin === self.location.origin && 'focus' in win) {
          return win.focus().then((w) => (w && 'navigate' in w ? w.navigate(target) : w));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
