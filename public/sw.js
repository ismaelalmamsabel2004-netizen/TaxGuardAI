self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Este oyente vacío es el truco profesional: activa la opción de "Instalar App" 
// en Android e iOS sin romper ni cachear por error tus llamadas cloud a la base de datos.
self.addEventListener('fetch', (event) => {
  // Pass-through directo
});