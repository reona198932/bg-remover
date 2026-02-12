// Service Worker for BG Remover app with offline caching support
// Cache version for easy updates
const CACHE_NAME = 'bg-remover-v1';

// Files to cache on install - only same-origin resources
const STATIC_ASSETS = [
  './',
  'index.html'
];

// External CDN resources that should NOT be cached
const EXTERNAL_ORIGINS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'imgly.io',
  'googlesyndication.com',
  'google.com'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Check if the request is to an external origin that should not be cached
  const isExternalCDN = EXTERNAL_ORIGINS.some((origin) => url.origin.includes(origin));

  if (isExternalCDN) {
    // For external CDN resources, just do a network request without caching
    event.respondWith(fetch(request));
    return;
  }

  // Network-first strategy for same-origin resources
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses (status 200)
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache when network fails
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return cachedResponse;
          }
          // Return a fallback response if neither network nor cache is available
          console.log('[Service Worker] No cache available for:', request.url);
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
