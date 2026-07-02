const CACHE_NAME = 'museo-real-alto-v2';
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/i18n.json',
    '/src/js/app.js',
    '/netlify.toml',
    '/public/images/home.webp',
    '/public/images/icon.svg',
    '/public/images/icon-maskable.svg',
    '/public/assets/markers/pattern-marcador-1.patt',
    '/public/assets/markers/pattern-marcador-2.patt'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        if (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') {
                            cache.put(event.request, responseClone).catch(() => {});
                        }
                    });
                }

                return networkResponse;
            }).catch(() => caches.match('/index.html'));
        })
    );
});