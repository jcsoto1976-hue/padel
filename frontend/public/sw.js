const CACHE_NAME = 'padel-club-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar el Service Worker y almacenar en caché recursos estáticos principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Abriendo caché de PADEL Club...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar el Service Worker y limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Eliminando caché vieja:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Manejar las peticiones (fetch)
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET (ej. POST de autenticación o de creación de reservas)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Estrategia Network-First con fallback a caché para las llamadas a la API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Guardar respuesta fresca en caché
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar devolver de caché
          return caches.match(event.request);
        })
    );
  } else {
    // Estrategia Cache-First para recursos estáticos (CSS, JS, imágenes, fuentes)
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request).then(response => {
            // No cachear respuestas que no sean válidas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cachear el nuevo recurso estático dinámicamente
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });

            return response;
          });
        })
    );
  }
});

// Escuchar notificaciones Push
self.addEventListener('push', event => {
  let data = { title: 'PADEL Club', body: 'Nueva notificación' };
  try {
    data = event.data.json();
  } catch (e) {
    if (event.data) {
      data = { title: 'PADEL Club', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const url = event.notification.data?.url || '/';
      for (let client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then(c => c.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
