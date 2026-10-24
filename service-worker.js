const CACHE_NAME = 'alo-rh-v1.4.1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/android.js?v=1.4.1',
  './js/config.js?v=1.4.1',
  './js/protocolo.js?v=1.4.1',
  './js/modelo.js?v=1.4.1',
  './js/armazenamento.js?v=1.4.1',
  './js/pin-proof.js?v=1.4.1',
  './js/autenticacao.js?v=1.4.1',
  './js/sync-seguro.js?v=1.4.1',
  './js/app-seguro.js?v=1.4.1',
  './js/acessibilidade.js?v=1.4.1',
  './css/seguranca.css?v=1.4.1',
  './css/icones.css?v=1.4.1',
  './css/inicio.css?v=1.4.1',
  './js/cabecalho.js?v=1.4.1',
  './icons/settings-gear.png',
  './icons/actions/ponto.svg',
  './icons/actions/quinzena.svg',
  './icons/actions/vt.svg',
  './icons/actions/docs.svg',
  './icons/actions/presenca.svg',
  './icons/ui/absence.svg?v=1.4.1',
  './icons/ui/alert.svg?v=1.4.1',
  './icons/ui/arrow-down.svg?v=1.4.1',
  './icons/ui/arrow-up.svg?v=1.4.1',
  './icons/ui/briefcase.svg?v=1.4.1',
  './icons/ui/building.svg?v=1.4.1',
  './icons/ui/bus.svg?v=1.4.1',
  './icons/ui/cake.svg?v=1.4.1',
  './icons/ui/calendar.svg?v=1.4.1',
  './icons/ui/card.svg?v=1.4.1',
  './icons/ui/chat.svg?v=1.4.1',
  './icons/ui/clipboard-check.svg?v=1.4.1',
  './icons/ui/clock.svg?v=1.4.1',
  './icons/ui/cloud.svg?v=1.4.1',
  './icons/ui/connection.svg?v=1.4.1',
  './icons/ui/eye.svg?v=1.4.1',
  './icons/ui/files.svg?v=1.4.1',
  './icons/ui/history.svg?v=1.4.1',
  './icons/ui/import.svg?v=1.4.1',
  './icons/ui/list.svg?v=1.4.1',
  './icons/ui/manager-key.svg?v=1.4.1',
  './icons/ui/package.svg?v=1.4.1',
  './icons/ui/pencil.svg?v=1.4.1',
  './icons/ui/people.svg?v=1.4.1',
  './icons/ui/receipt.svg?v=1.4.1',
  './icons/ui/refresh.svg?v=1.4.1',
  './icons/ui/restore.svg?v=1.4.1',
  './icons/ui/settings.svg?v=1.4.1',
  './icons/ui/shield.svg?v=1.4.1',
  './icons/ui/tag.svg?v=1.4.1',
  './icons/ui/trash-2.svg?v=1.4.1',
  './icons/ui/umbrella.svg?v=1.4.1',
  './icons/ui/wallet.svg?v=1.4.1',
  './icons/ui/pix.svg?v=1.4.1',
  './icons/ui/whatsapp.svg?v=1.4.1',


  './css/styles.css?v=1.4.1',
  './js/dados.js?v=1.4.1',
  './js/calculos.js?v=1.4.1',
  './js/interface.js?v=1.4.1',
  './js/impressao.js?v=1.4.1',
  './js/sincronizacao.js?v=1.4.1',
  './icons/alo-rh-v120-192.png',
  './icons/alo-rh-v120-512.png',
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

  // O instalador precisa dos metadados atuais; o cache é apenas uma cópia offline.
  if (url.pathname === new URL('./manifest.json', self.registration.scope).pathname) {
    event.respondWith(
      fetch(request).then(async response => {
        if (!response.ok) throw new Error('Manifest indisponível');
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./manifest.json', copy)));
        return response;
      }).catch(async () => {
        const cached = await caches.match('./manifest.json');
        return cached || Response.error();
      })
    );
    return;
  }

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
