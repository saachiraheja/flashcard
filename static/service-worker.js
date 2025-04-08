self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('flashcards-cache').then(function (cache) {
            return cache.addAll([
                '/',
                '/static/css/styles.css',
                '/static/js/app.js',
                '/static/manifest.json',
                '/static/images/icon-192x192.png',
                '/static/images/icon-512x512.png'
            ]);
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});
