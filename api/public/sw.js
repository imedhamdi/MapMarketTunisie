const CACHE = 'mapmarket-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
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
    console.error('[SW v3] Invalid URL:', event.request.url, error);
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
    console.log('[SW v3] Bypassing API request:', requestUrl.pathname);
    return;
  }
  
  // Don't intercept uploaded files (avatars, images, etc.)
  if (requestUrl.pathname.startsWith('/uploads/')) {
    console.log('[SW v3] Bypassing upload request:', requestUrl.pathname);
    return;
  }
  
  // Cache static assets only
  console.log('[SW v3] Caching static asset:', requestUrl.pathname);
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          console.log('[SW v3] Serving from cache:', requestUrl.pathname);
          return cached;
        }
        console.log('[SW v3] Fetching from network:', requestUrl.pathname);
        return fetch(event.request);
      })
      .catch((error) => {
        console.error('[SW v3] Error handling request:', requestUrl.pathname, error);
        // Return a network fetch as fallback
        return fetch(event.request);
      })
  );
});
