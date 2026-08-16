/**
 * Service worker minimo: serve a due cose.
 *
 *  1. rendere l'app installabile (Chrome chiede un service worker con un
 *     gestore di `fetch` per proporre «Aggiungi a schermata Home»);
 *  2. farla partire anche senza rete — in cantiere capita.
 *
 * Strategia:
 *  - navigazioni (index.html): prima la rete, la cache come riserva, così un
 *    deploy nuovo si vede al primo caricamento utile;
 *  - risorse con hash nel nome (JS, CSS, icone): prima la cache — il nome
 *    cambia a ogni build, quindi non si serve mai roba vecchia per sbaglio.
 */

const CACHE = 'structural-v1';
const GUSCIO = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(GUSCIO))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copia));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        }),
    ),
  );
});
