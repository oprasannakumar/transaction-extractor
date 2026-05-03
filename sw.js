self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Match the 'action' defined in your manifest.json
  if (event.request.method === 'POST' && url.pathname === '/') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get('image'); // 'image' matches the manifest name

        // Open the app and send the file data via a MessageChannel or 
        // store it in Cache/IndexedDB so the page can grab it on load.
        // For simplicity, we use the Cache API:
        const cache = await caches.open('shared-data');
        await cache.put('/shared-image', new Response(file));

        // Redirect the user to the main page to see the UI
        return Response.redirect('/?shared=true', 303);
      })()
    );
  }
});
