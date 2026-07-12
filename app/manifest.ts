import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaxGuard AI - Gestión Fiscal',
    short_name: 'TaxGuardAI',
    description: 'Director Financiero Inteligente',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon-192x192.jpg', // Cambiado a .jpg
        sizes: '192x192',
        type: 'image/jpeg', // Cambiado a jpeg
        purpose: 'any',
      },
      {
        src: '/icon-512x512.jpg', // Cambiado a .jpg
        sizes: '512x512',
        type: 'image/jpeg', // Cambiado a jpeg
        purpose: 'any',
      },
    ],
  }
}