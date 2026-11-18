// FoundersLink's service worker: it makes the installed app open fast and
// keeps it opening on a weak or missing network.
//
// - Pages: the network first, so a new version shows as soon as it is
//   online; the saved copy when the network fails.
// - The app's code, fonts and pictures: the saved copy first. Their file
//   names change with every build, so a saved copy is never out of date.
// - Anything on another address (the backend, when there is one) is left
//   alone: members' data is never saved by the service worker.

const VERSION = 'founderslink-v1';
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  // Old versions' saved files are removed.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Every page of the app is the same index.html; the app picks the screen.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((saved) =>
      saved ||
      fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      }),
    ),
  );
});
