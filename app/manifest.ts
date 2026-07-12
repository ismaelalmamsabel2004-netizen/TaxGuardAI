import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaxGuard AI - Gestión Fiscal',
    short_name: 'TaxGuardAI',
    description: 'Director Financiero Inteligente y Contabilidad Automatizada para PYMEs',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon-192x192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}