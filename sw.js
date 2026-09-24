const CACHE_NAME = 'shared-data-v2';
const SHARED_IMAGE_KEY = '/shared-image';

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');

    event.waitUntil(
        (async () => {
            await self.clients.claim();

            // Remove old shared-data cache versions
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter(name => name.startsWith('shared-data') && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );

            console.log('[SW] Activated');
        })()
    );
});

self.addEventListener('fetch', event => {

    const request = event.request;

    /*
     * Handle Android Web Share Target
     */
    if (
        request.method === 'POST' &&
        new URL(request.url).pathname === '/transaction-extractor/'
    ) {

        event.respondWith(handleShareTarget(request));

        return;
    }
});


async function handleShareTarget(request) {

    try {

        console.log('[SW] Share request received');

        /*
         * Read multipart/form-data
         */
        const formData = await request.formData();

        /*
         * Debug all received fields
         */
        for (const [key, value] of formData.entries()) {

            if (value instanceof File) {

                console.log(
                    '[SW] File received:',
                    key,
                    value.name,
                    value.type,
                    value.size
                );

            } else {

                console.log(
                    '[SW] Field received:',
                    key,
                    value
                );
            }
        }


        /*
         * Get shared image
         */
        let imageFile = formData.get('image');


        /*
         * Some browsers may provide the first image
         * under another field.
         */
        if (!(imageFile instanceof File) || imageFile.size === 0) {

            console.warn('[SW] "image" field missing.');

            for (const [key, value] of formData.entries()) {

                if (
                    value instanceof File &&
                    value.size > 0 &&
                    value.type.startsWith('image/')
                ) {

                    console.log(
                        '[SW] Using fallback image field:',
                        key
                    );

                    imageFile = value;
                    break;
                }
            }
        }


        /*
         * No image received
         */
        if (
            !(imageFile instanceof File) ||
            imageFile.size === 0
        ) {

            console.error('[SW] No valid image received.');

            return Response.redirect(
                '/transaction-extractor/?shared=error',
                303
            );
        }


        console.log(
            '[SW] Saving image:',
            imageFile.name,
            imageFile.type,
            imageFile.size
        );


        /*
         * Open cache
         */
        const cache = await caches.open(CACHE_NAME);


        /*
         * Delete any previous shared image
         */
        await cache.delete(SHARED_IMAGE_KEY);


        /*
         * Store image
         */
        await cache.put(
            SHARED_IMAGE_KEY,
            new Response(imageFile, {
                headers: {
                    'Content-Type': imageFile.type || 'image/jpeg',
                    'Content-Length': String(imageFile.size)
                }
            })
        );


        console.log('[SW] Image stored successfully');


        /*
         * Redirect to application
         */
        return Response.redirect(
            '/transaction-extractor/?shared=1',
            303
        );

    } catch (error) {

        console.error(
            '[SW] Share handling failed:',
            error
        );

        return Response.redirect(
            '/transaction-extractor/?shared=error',
            303
        );
    }
}