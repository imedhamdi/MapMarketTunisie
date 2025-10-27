const CACHE = 'mapmarket-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/dist/tokens.min.css',
  '/dist/app.min.css',
  '/dist/critical.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
  );
  // Claim clients immediately after activation
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Safely handle URL parsing
  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch (error) {
    return; // Let the browser handle it
  }

  // Don't intercept requests from different origins
  if (requestUrl.origin !== location.origin) {
    return;
  }

  // Don't intercept non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // Don't intercept API requests - let them pass through to the server
  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // Don't intercept uploaded files (avatars, images, etc.)
  if (requestUrl.pathname.startsWith('/uploads/')) {
    return;
  }

  // Cache static assets only
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // Return a network fetch as fallback
        return fetch(event.request);
      })
  );
});
