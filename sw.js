self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Match POST requests sent to your app scope
  if (event.request.method === 'POST' && url.pathname.includes('/transaction-extractor/')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');

        if (imageFile && imageFile.size > 0) {
          const cache = await caches.open('shared-data');
          const buffer = await imageFile.arrayBuffer();
          const mimeType = imageFile.type || 'image/jpeg';

          // Store with a relative URL matching the app origin and path
          await cache.put(
            new Request(`${self.registration.scope}shared-image-${Date.now()}`),
            new Response(buffer, {
              headers: {
                'Content-Type': mimeType,
                'Content-Length': buffer.byteLength.toString()
              }
            })
          );
        }
      } catch (err) {
        console.error('Share Target Error:', err);
      }

      // Use the registration scope to build the absolute redirect URL
      const redirectUrl = new URL(self.registration.scope);
      redirectUrl.searchParams.set('shared', 'true');
      
      return Response.redirect(redirectUrl.href, 303);
    })());
  }
});
