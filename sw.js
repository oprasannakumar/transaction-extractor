/* ============================================================
   Transaction Extractor — Service Worker
   Handles the Web Share Target POST and stashes files in cache.
   ============================================================ */

const SHARE_CACHE = 'shared-data-v2';
const SHARE_ENDPOINT = '/transaction-extractor/share';
const APP_ROOT = '/transaction-extractor/';
const SW_VERSION = 'v4';

/* ---------- Lifecycle ---------- */

self.addEventListener('install', (event) => {
  // Activate the new SW immediately instead of waiting for all
  // clients to close. Without this, an updated SW can sit in the
  // "waiting" state forever on an installed PWA, and the OLD,
  // possibly broken handler keeps serving share POSTs.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop every cache except the share cache (e.g. stale SW-versioned caches)
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== SHARE_CACHE).map((k) => caches.delete(k))
    );

    // Take control of already-open pages right now.
    await self.clients.claim();
    console.log('[SW] activated', SW_VERSION);
  })());
});

/* ---------- Fetch ---------- */

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only intercept the share-target POST. Everything else falls
  // through to the network / HTTP cache untouched.
  if (req.method === 'POST' && url.pathname.startsWith(SHARE_ENDPOINT)) {
    event.respondWith(handleShare(req));
  }
});

/* ---------- Share handler ---------- */

async function handleShare(request) {
  try {
    const formData = await request.formData();

    // getAll so multi-image shares aren't silently truncated.
    const files = formData
      .getAll('image')
      .filter((f) => f && typeof f === 'object' && f.size > 0);

    const sharedText = (formData.get('text') || '').toString().trim();
    const sharedTitle = (formData.get('title') || '').toString().trim();

    const cache = await caches.open(SHARE_CACHE);

    // Wipe the previous batch so a failed extraction from last time
    // can never be confused with the share the user just made.
    const stale = await cache.keys();
    await Promise.all(stale.map((k) => cache.delete(k)));

    if (!files.length && !sharedText) {
      // Nothing usable arrived — bounce back with a flag the page can read.
      return Response.redirect(APP_ROOT + '?shared_error=empty', 303);
    }

    const stamp = Date.now();

    await Promise.all(
      files.map((file, i) =>
        cache.put(
          new Request(`${APP_ROOT}shared-file-${stamp}-${i}`),
          new Response(file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'X-Shared-Name': encodeURIComponent(file.name || `image-${i}`)
            }
          })
        )
      )
    );

    if (sharedText || sharedTitle) {
      await cache.put(
        new Request(`${APP_ROOT}shared-text-${stamp}`),
        new Response(JSON.stringify({ title: sharedTitle, text: sharedText }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    // 303 forces the browser to follow up with a GET, so the page
    // loads normally instead of re-POSTing on refresh.
    return Response.redirect(APP_ROOT + '?shared=1', 303);
  } catch (err) {
    console.error('[SW] share handling failed:', err);
    return Response.redirect(APP_ROOT + '?shared_error=1', 303);
  }
}