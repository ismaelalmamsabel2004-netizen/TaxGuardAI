import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaxGuard AI - Gestión Fiscal',
    short_name: 'TaxGuardAI',
    description: 'Director Financiero Inteligente',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a', // 👈 Vuelve el azul oscuro corporativo
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon-192x192.png?v=3', // Volvemos a .png
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png?v=3', // Volvemos a .png
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}