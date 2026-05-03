self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.searchParams.has('shared')) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const files = formData.getAll('shared-image'); // Capture all files
        const cache = await caches.open('shared-data');
        
        // Clear old shared data to start fresh
        const keys = await cache.keys();
        for (const key of keys) await cache.delete(key);

        // Store each image with a unique timestamp/index
        for (let i = 0; i < files.length; i++) {
          await cache.put(`shared-image-${Date.now()}-${i}`, new Response(files[i]));
        }
        
        return Response.redirect('./index.html?shared=1', 303);
      })()
    );
  }
});
