const CACHE_NAME = 'cardapio-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Permite que as requisições para a API e Supabase passem normalmente pela rede
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});