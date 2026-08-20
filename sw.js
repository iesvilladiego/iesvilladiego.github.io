/* ═══════════════════════════════════════════════════════════════
   Service Worker — Portal IES Virgen de Villadiego
   ═══════════════════════════════════════════════════════════════
   - Cache-first para assets estáticos (HTML, CSS inline, JS inline, iconos)
   - Network-first para documentos HTML (siempre la versión más reciente online)
   - NO intercepta las llamadas a Firebase Realtime Database
     (esos datos se cargan en tiempo real, no se cachean)
   - Si offline y el HTML no está cacheado, sirve la versión cacheada
╔═════════════════════════════════════════════════════════════════*/

const CACHE_VERSION = 'portal-ies-v4';
const CACHE_NAME = CACHE_VERSION;

// Recursos estáticos que se cachean al instalar la PWA
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './browserconfig.xml',
  './img/escudo.png',
  './img/favicon.ico',
  './img/favicon-16x16.png',
  './img/favicon-32x32.png',
  './img/favicon-48x48.png',
  './img/icon-96x96.png',
  './img/icon-144x144.png',
  './img/icon-192x192.png',
  './img/icon-256x256.png',
  './img/icon-384x384.png',
  './img/icon-512x512.png',
  './img/icon-512x512-maskable.png',
  './img/apple-touch-icon.png',
  // Firebase SDK (para que cargue offline la primera vez)
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js',
];

// Dominios que NO deben pasarse por la caché (siempre online)
const BYPASS_DOMAINS = [
  'firebasedatabase.app',
  'firebaseio.com',
  'firestore.googleapis.com',
];

// ── INSTALL: pre-cachear recursos estáticos ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll falla si algún recurso no está disponible;
        // usamos add con try/catch individual para que no rompa toda la instalación
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) =>
              console.warn('[SW] No se pudo cachear', url, err.message)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar cachés antiguas y tomar control ───────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Eliminando caché antigua:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia según tipo de recurso ─────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignorar peticiones no GET (POST, PUT, etc.)
  if (req.method !== 'GET') return;

  // Ignorar peticiones a Firebase (datos en tiempo real, no cacheables)
  const url = new URL(req.url);
  if (BYPASS_DOMAINS.some((d) => url.hostname.includes(d))) {
    return; // Dejar que Firebase gestione sus propias peticiones
  }

  // Ignorar extensiones de Chrome y otras
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // ── Documentos HTML: network-first con fallback a caché ──
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // Guardar la versión fresca en caché
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });
          return response;
        })
        .catch(() => {
          // Sin conexión: servir la versión cacheada
          return caches.match(req).then((cached) => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // ── Recursos estáticos (CSS, JS, imágenes, iconos): cache-first ──
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Devolver caché inmediatamente y actualizar en segundo plano
        fetch(req)
          .then((response) => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, clone);
              });
            }
          })
          .catch(() => { /* offline, no se puede actualizar */ });
        return cached;
      }
      // No está en caché: ir a la red
      return fetch(req)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          // Cacheamos responses válidos (mismo dominio o CORS abierto)
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });
          return response;
        })
        .catch(() => {
          // Sin conexión ni caché: nada que hacer para assets no HTML
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});

// ── MESSAGE: permitir al frontend forzar actualización ──────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
