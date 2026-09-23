self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST' && event.request.url.includes('/transaction-extractor/')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');

        if (imageFile && imageFile.size > 0) {
          const cache = await caches.open('shared-data');
          
          // Read full buffer so Android doesn't drop the stream on redirect
          const buffer = await imageFile.arrayBuffer();
          const mimeType = imageFile.type || 'image/jpeg';
          
          await cache.put(
            new Request('/shared-image'),
            new Response(buffer, {
              headers: {
                'Content-Type': mimeType,
                'Content-Length': buffer.byteLength.toString()
              }
            })
          );
        } else {
          console.warn('Share target received no valid image file.');
        }
      } catch (err) {
        console.error('Failed to parse shared form data:', err);
      }

      return Response.redirect('/transaction-extractor/?shared=1', 303);
    })());
  }
});
