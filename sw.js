self.addEventListener('fetch', (event) => {
  // Check if this is a POST request to our share target
  if (event.request.method === 'POST' && 
      event.request.url.includes('/transaction-extractor/')) {
    
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const imageFile = formData.get('image');
      
      // Open a cache and store the image blob
      const cache = await caches.open('shared-data');
      await cache.put('shared-image', new Response(imageFile));

      // Redirect the user to the main page with a query parameter
      // Using 303 See Other tells the browser to change POST to GET
      return Response.redirect('/transaction-extractor/?shared=1', 303);
    })());
  }
});
