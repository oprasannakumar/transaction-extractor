const repoPath = '/transaction-extractor/';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Capture the POST request from the share menu
    if (event.request.method === 'POST' && url.pathname === repoPath) {
        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                const imageFile = formData.get('image');
                
                // Temporarily store image in Cache API
                const cache = await caches.open('shared-data');
                await cache.put('shared-image', new Response(imageFile));

                // Redirect to the main UI with a signal to check the cache
                return Response.redirect(`${repoPath}?shared=true`, 303);
            })()
        );
    }
});
