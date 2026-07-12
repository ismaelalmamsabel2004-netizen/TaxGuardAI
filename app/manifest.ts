import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaxGuard AI - Gestión Fiscal',
    short_name: 'TaxGuardAI',
    description: 'Director Financiero Inteligente',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff', // 👈 CAMBIADO A BLANCO PURO
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon-192x192.jpg', 
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  }
}