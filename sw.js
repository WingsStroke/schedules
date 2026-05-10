"use strict";

// v2.0.0-20260505-e649893b69ba - Generado automáticamente por build.js
const CACHE_VERSION = 'v2.0.0-20260505-e649893b69ba';
const CACHE_NAME = `horarios-udec-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './changelog.json',
  // CSS
  './css/styles.css',
  './css/dark-mode.css',
  './css/responsive.css',
  './css/sidebar-panel.css',
  './css/filtros-asignaturas.css',
  './css/minihorarios-styles.css',
  // JS Core
  './js/core.js',
  './js/storage-db.js',
  './js/state-manager.js',
  './js/calculadora-aguinaldo.js',
  './js/dom-renderer.js',
  './js/export-engine.js',
  './js/toast-system.js',
  './js/dark-mode.js',
  './js/app.js',
  // JS Features (generación de horarios)
  './js/motor-combinaciones.js',
  './js/cargador-combinaciones.js',
  './js/sistema-carga-ofertas.js',
  './js/sidebar-panel.js',
  './js/minihorarios-ui.js',
  './js/integracion-busqueda.js',
  // Data
  './data/ofertas.json',
  './data/2026-1_sistemas.json',
  './data/2026-1_alimentos.json',
  './data/2026-1_quimica.json',
  // Assets
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// FASE 1: INSTALACIÓN SILENCIOSA
// FASE 1: INSTALACIÓN SILENCIOSA Y "CACHE BUSTING"
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Nueva versión siendo cacheada
      // Usamos cache: 'reload' para obligar al navegador a ir al servidor, saltándose la caché HTTP
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return fetch(new Request(url, { cache: 'reload' }))
            .then(response => {
              if (!response.ok) throw new Error(`Fetch falló para ${url}`);
              return cache.put(url, response);
            });
        })
      );
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
            // Limpiando caché antigua
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
// Helper para obtener URL sin query params (para cache matching)
function getCacheUrl(request) {
  const url = new URL(request.url);
  // Remover query params para matching de cache
  url.search = '';
  return url.toString();
}

self.addEventListener('fetch', (event) => {
  // Solo aplicamos esto a nuestros archivos locales
  if (event.request.url.includes(self.location.origin)) {
    const cacheUrl = getCacheUrl(event.request);
    
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          // 1. Hay internet: Descargamos la versión más fresca del servidor,
          // la clonamos para guardarla en la caché y se la mostramos al usuario.
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Guardar sin query params para matching consistente
            cache.put(cacheUrl, resClone);
          });
          return response;
        })
        .catch(() => {
          // 2. NO hay internet (o el servidor falló): Rescatamos la página desde la caché local.
          // Modo offline activado
          return caches.match(cacheUrl);
        })
    );
  } else {
    // Para CDNs externos (fuentes, librerías PDF), usamos "Cache-First" por rendimiento.
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  }
});