import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaxGuard AI - Gestión Fiscal',
    short_name: 'TaxGuardAI',
    description: 'Director Financiero Inteligente y Contabilidad Automatizada para PYMEs',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a', // Color de fondo slate-900 al arrancar la app
    theme_color: '#2563eb',      // Color azul de tus botones principales para la barra del móvil
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}