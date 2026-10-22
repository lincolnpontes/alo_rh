const CACHE_NAME = 'alo-rh-v1.1.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/config.js',
  './js/protocolo.js',
  './js/modelo.js',
  './js/armazenamento.js',
  './js/autenticacao.js',
  './js/sync-seguro.js',
  './js/app-seguro.js',
  './js/acessibilidade.js',
  './css/seguranca.css?v=1.1.0',
  './css/icones.css?v=1.1.0',
  './icons/ui/absence.svg',
  './icons/ui/alert.svg',
  './icons/ui/arrow-down.svg',
  './icons/ui/arrow-up.svg',
  './icons/ui/briefcase.svg',
  './icons/ui/building.svg',
  './icons/ui/bus.svg',
  './icons/ui/cake.svg',
  './icons/ui/calendar.svg',
  './icons/ui/card.svg',
  './icons/ui/chat.svg',
  './icons/ui/clipboard-check.svg',
  './icons/ui/clock.svg',
  './icons/ui/cloud.svg',
  './icons/ui/connection.svg',
  './icons/ui/eye.svg',
  './icons/ui/files.svg',
  './icons/ui/history.svg',
  './icons/ui/import.svg',
  './icons/ui/list.svg',
  './icons/ui/manager-key.svg',
  './icons/ui/package.svg',
  './icons/ui/pencil.svg',
  './icons/ui/people.svg',
  './icons/ui/receipt.svg',
  './icons/ui/refresh.svg',
  './icons/ui/restore.svg',
  './icons/ui/settings.svg',
  './icons/ui/shield.svg',
  './icons/ui/tag.svg',
  './icons/ui/trash-2.svg',
  './icons/ui/umbrella.svg',
  './icons/ui/wallet.svg',


  './css/styles.css?v=1.1.0',
  './js/dados.js?v=1.1.0',
  './js/calculos.js?v=1.1.0',
  './js/interface.js?v=1.1.0',
  './js/impressao.js?v=1.1.0',
  './js/sincronizacao.js?v=1.1.0',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('alo-rh-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname) || url.pathname.includes('/__dev__/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if(!response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request).then((response) => {
        if(!response.ok) return response;
          const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }))
  );
});
