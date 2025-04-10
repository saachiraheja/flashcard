self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('flashcard-cache-v1').then(function(cache) {
      return cache.addAll([
        '/',
        '/static/manifest.json',
        '/static/js/script.js',
        '/static/images/icon-128x128.png',
        '/static/images/icon-512x512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', function(event) {
  const cacheWhitelist = ['flashcard-cache-v1'];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background Sync - For syncing offline-created flashcards or decks
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-flashcards') {
    event.waitUntil(syncFlashcardsToServer());
  }
});

async function syncFlashcardsToServer() {
  const cards = await getUnsyncedFlashcards(); // Replace with IndexedDB logic
  for (const card of cards) {
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        body: JSON.stringify(card),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        await markCardAsSynced(card.id);
      }
    } catch (err) {
      console.error('Sync failed for card', card.id, err);
    }
  }
}

// Push Notifications - For reminders or study tips
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Time to study your flashcards!',
    icon: '/static/images/icon-128x128.png',
    badge: '/static/images/icon-128x128.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Flashcard Reminder', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Demo IndexedDB stubs — replace with real logic
async function getUnsyncedFlashcards() {
  return [{ id: 1, question: 'What is PWA?', answer: 'Progressive Web App' }];
}

async function markCardAsSynced(id) {
  console.log(`✅ Flashcard ${id} marked as synced.`);
}
