self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname.includes('/transaction-extractor/')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        
        // Check all common field names or fallback to the first available file entry
        let imageFile = formData.get('image') || formData.get('file') || formData.get('files');
        if (!imageFile) {
          for (const [key, value] of formData.entries()) {
            if (value instanceof File || (value && value.type && value.type.startsWith('image/'))) {
              imageFile = value;
              break;
            }
          }
        }

        if (imageFile) {
          const buffer = await imageFile.arrayBuffer();
          const mimeType = imageFile.type || 'image/jpeg';
          const freshBlob = new Blob([buffer], { type: mimeType });

          // 1. Post directly to any already-opened app windows (fixes the running app issue)
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of allClients) {
            client.postMessage({
              action: 'PROCESS_SHARED_IMAGE',
              blob: freshBlob
            });
          }

          // 2. Also save to cache in case the app is launched cold
          const cache = await caches.open('shared-data');
          await cache.put(
            new Request(`${self.registration.scope}shared-image-${Date.now()}`),
            new Response(freshBlob, {
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

      // Redirect to the main page
      const redirectUrl = new URL(self.registration.scope);
      redirectUrl.searchParams.set('shared', 'true');
      return Response.redirect(redirectUrl.href, 303);
    })());
  }
});
