"use strict";

// Cambia esta versión cuando subas actualizaciones grandes
const CACHE_VERSION = 'v2.0.0-beta-63';
const CACHE_NAME = `horarios-udec-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './css/dark-mode.css',
  './css/responsive.css',
  './js/core.js',
  './js/storage-db.js',
  './js/state-manager.js',
  './js/calculadora-aguinaldo.js',
  './js/dom-renderer.js',
  './js/export-engine.js',
  './js/toast-system.js',
  './js/app.js'
];

// FASE 1: INSTALACIÓN SILENCIOSA
self.addEventListener('install', (event) => {
  // skipWaiting() hace que el SW se instale en segundo plano sin interrumpir al usuario.
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[PWA] Preparando nueva versión en segundo plano: ${CACHE_VERSION}`);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// FASE 2: ACTIVACIÓN Y LIMPIEZA
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Borramos las cachés de versiones anteriores para no saturar el celular
          if (cacheName.startsWith('horarios-udec-') && cacheName !== CACHE_NAME) {
            console.log('[PWA] Limpiando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // clients.claim() permite que el SW tome control de la sesión actual silenciosamente,
  // preparando el terreno para que el próximo "refresco" use la lógica nueva.
  return self.clients.claim();
});

// FASE 3: ESTRATEGIA "NETWORK-FIRST" (Red primero, Caché como respaldo)
self.addEventListener('fetch', (event) => {
  // Solo aplicamos esto a nuestros archivos locales
  if (event.request.url.includes(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 1. Hay internet: Descargamos la versión más fresca del servidor,
          // la clonamos para guardarla en la caché y se la mostramos al usuario.
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => {
          // 2. NO hay internet (o el servidor falló): Rescatamos la página desde la caché local.
          console.log('[PWA] Modo offline activado para:', event.request.url);
          return caches.match(event.request);
        })
    );
  } else {
    // Para CDNs externos (fuentes, librerías PDF), usamos "Cache-First" por rendimiento.
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  }
});