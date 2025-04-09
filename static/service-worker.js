// Install event - Caching initial files
self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('ecommerce-cache').then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/static/css/styles.css',
          '/static/js/app.js',
          '/static/images/icon-128x128.png',
          '/static/images/icon-512x512.png'
        ]);
      })
    );
  });
  
  // Activate event - Clean up old caches
  self.addEventListener('activate', (event) => {
    const cacheWhitelist = ['ecommerce-cache'];  // Set the cache you want to keep
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              return caches.delete(cacheName);  // Delete old caches
            }
          })
        );
      })
    );
  });
  
  // Fetch event - Cache-first strategy for most requests
  self.addEventListener('fetch', (event) => {
    // For HTML requests, fetch from the network first, then cache
    if (event.request.url.endsWith('.html')) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || fetch(event.request).then((networkResponse) => {
            return caches.open('ecommerce-cache').then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
      );
    } else {
      // For other requests (JS, CSS, images), use cache-first strategy
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
      );
    }
  });
  
  // Sync event - Background synchronization for pending actions (e.g., sending orders)
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-order') {
      event.waitUntil(syncOrderData());
    }
  });
  
  // Push event - Show notifications when a push message is received
  self.addEventListener('push', (event) => {
    const options = {
      body: event.data ? event.data.text() : 'You have a new notification!',
      icon: '/static/images/icon-128x128.png',
      badge: '/static/images/icon-128x128.png'
    };
    
    event.waitUntil(
      self.registration.showNotification('New Product Available!', options)
    );
  });
  
  // Example function for syncing order data in the background
  function syncOrderData() {
    // Your logic to sync the order data with the server
    console.log('Syncing order data...');
    // This could involve making a network request to a server to send order details.
    return fetch('/api/sync-order', {
      method: 'POST',
      body: JSON.stringify({ orderId: 12345 }),  // Example payload
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((data) => console.log('Order synced successfully:', data))
      .catch((error) => console.error('Error syncing order data:', error));
  }
  