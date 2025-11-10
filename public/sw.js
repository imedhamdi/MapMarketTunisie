const CACHE = 'mapmarket-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/dist/tokens.min.css',
  '/dist/app.min.css',
  '/dist/critical.min.css',
  '/dist/app.min.js',
  '/dist/profile-modal.min.js'
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

  // Don't intercept uploaded files (avatars, images, etc.) - let browser handle them
  if (requestUrl.pathname.startsWith('/uploads/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Don't intercept socket.io requests
  if (requestUrl.pathname.startsWith('/socket.io/')) {
    return;
  }

  const isHtmlRequest = event.request.headers.get('accept')?.includes('text/html');
  const isStaticAsset =
    requestUrl.pathname.startsWith('/dist/') ||
    requestUrl.pathname.startsWith('/icons/') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.js');

  if (isHtmlRequest) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isStaticAsset) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // For other resources, try cache first with network fallback
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);

    if (cached) {
      // Update cache in background
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.ok) {
            cache.put(request, response.clone());
          }
        })
        .catch(() => {
          // Silently fail - we already have cached version
        });
      return cached;
    }

    const response = await fetch(request);
    if (response && response.status === 200 && response.ok) {
      cache.put(request, response.clone()).catch(() => {
        // Failed to cache, but still return response
      });
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first error:', error);
    // If everything fails, try to fetch without caching
    return fetch(request);
  }
}

async function networkFirst(request) {
  try {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response && response.status === 200 && response.ok) {
        cache.put(request, response.clone()).catch(() => {
          // Failed to cache, but still return response
        });
      }
      return response;
    } catch (error) {
      console.warn('[SW] Network request failed, trying cache:', error.message);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      throw error;
    }
  } catch (error) {
    console.error('[SW] Network first error:', error);
    throw error;
  }
}
