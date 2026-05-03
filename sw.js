const CACHE_NAME = 'shared-data';

// 1. INSTALLATION: Skip waiting to ensure the SW activates immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. ACTIVATION: Claim clients to start controlling the page right away
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 3. FETCH: Intercept the Share Target request
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is a POST request to our share target action
  if (event.request.method === 'POST' && url.searchParams.has('shared')) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('shared-image'); // Match the name in manifest.json
          const cache = await caches.open(CACHE_NAME);
          
          // Clear any previous shared data to prevent overlap
          const keys = await cache.keys();
          for (const key of keys) {
            await cache.delete(key);
          }

          // Store each shared file in the cache with a unique identifier
          for (let i = 0; i < files.length; i++) {
            // Using a timestamp + index to ensure uniqueness for batch processing
            const cacheKey = `shared-image-${Date.now()}-${i}`;
            await cache.put(cacheKey, new Response(files[i]));
          }
          
          // Redirect to the main UI with the 'shared' flag
          // Using 303 See Other to convert POST to GET for the redirect
          return Response.redirect('./index.html?shared=1', 303);
          
        } catch (error) {
          console.error('SW: Share failed', error);
          return Response.redirect('./index.html?error=share_failed', 303);
        }
      })()
    );
  }
});
