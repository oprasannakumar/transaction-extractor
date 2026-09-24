const CACHE_NAME = 'shared-data-v3';
const SHARED_IMAGE_KEY = '/shared-image';

self.addEventListener('install', event => {
    console.log('[SW] Installing v3...');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating v3...');

    event.waitUntil(
        (async () => {
            await self.clients.claim();

            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter(name =>
                        name.startsWith('shared-data') &&
                        name !== CACHE_NAME
                    )
                    .map(name => caches.delete(name))
            );

            console.log('[SW] Activated v3');
        })()
    );
});


self.addEventListener('fetch', event => {

    const request = event.request;

    /*
     * IMPORTANT:
     * Only intercept POST requests.
     */
    if (request.method !== 'POST') {
        return;
    }

    const url = new URL(request.url);

    /*
     * Handle Web Share Target POST.
     *
     * Do NOT rely on an exact pathname here.
     * This makes the worker more tolerant of GitHub Pages routing.
     */
    if (
        url.pathname === '/transaction-extractor/' ||
        url.pathname === '/transaction-extractor/index.html'
    ) {

        console.log(
            '[SW] Intercepting Share Target:',
            request.method,
            url.href
        );

        event.respondWith(handleShare(request));
    }
});


async function handleShare(request) {

    try {

        console.log('[SW] Reading multipart form...');

        const formData = await request.formData();

        let imageFile = null;

        /*
         * First try the manifest-defined field.
         */
        const imageField = formData.get('image');

        if (
            imageField instanceof File &&
            imageField.size > 0
        ) {
            imageFile = imageField;
        }


        /*
         * Fallback:
         * Find ANY image file in the multipart request.
         */
        if (!imageFile) {

            for (const [key, value] of formData.entries()) {

                if (
                    value instanceof File &&
                    value.size > 0 &&
                    value.type &&
                    value.type.startsWith('image/')
                ) {

                    console.log(
                        '[SW] Found fallback image:',
                        key,
                        value.name,
                        value.type,
                        value.size
                    );

                    imageFile = value;
                    break;
                }
            }
        }


        /*
         * No image received.
         */
        if (!imageFile) {

            console.error(
                '[SW] Share request contained no image.'
            );

            return Response.redirect(
                '/transaction-extractor/?shared=error',
                303
            );
        }


        console.log(
            '[SW] Image received:',
            imageFile.name,
            imageFile.type,
            imageFile.size
        );


        /*
         * Save image to Cache Storage.
         */
        const cache = await caches.open(CACHE_NAME);

        await cache.delete(SHARED_IMAGE_KEY);

        const imageResponse = new Response(imageFile, {
            status: 200,
            headers: {
                'Content-Type':
                    imageFile.type || 'application/octet-stream'
            }
        });

        await cache.put(
            SHARED_IMAGE_KEY,
            imageResponse
        );


        console.log(
            '[SW] Image successfully cached.'
        );


        /*
         * Redirect POST → GET.
         */
        return Response.redirect(
            '/transaction-extractor/?shared=1',
            303
        );

    } catch (error) {

        console.error(
            '[SW] Share processing error:',
            error
        );

        return Response.redirect(
            '/transaction-extractor/?shared=error',
            303
        );
    }
}