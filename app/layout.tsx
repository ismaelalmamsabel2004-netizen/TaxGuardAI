import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PwaActivator from './PwaActivator';
import { esES } from '@clerk/localizations';

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

// 🚀 MEJORA B2B: SEO, OpenGraph y configuración completa para PWA (Progressive Web App)
export const metadata: Metadata = {
  title: 'TaxGuard AI | Director Financiero con Inteligencia Artificial',
  description: 'Automatiza tu contabilidad, escanea facturas al instante y genera los modelos oficiales de Hacienda sin depender de terceros. El control total de tu rentabilidad en tiempo real.',
  generator: 'Next.js',
  applicationName: 'TaxGuard AI',
  keywords: ['contabilidad', 'ia', 'facturación', 'modelos hacienda', 'autónomos', 'pymes', 'director financiero', 'b2b'],
  authors: [{ name: 'TaxGuard AI' }],
  manifest: '/manifest.json', // Esencial para que la instalación PWA sea perfecta
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'TaxGuard AI | Tu CFO Virtual',
    description: 'Controla tu rentabilidad en tiempo real y automatiza tus impuestos.',
    url: 'https://www.taxguard-ai.com',
    siteName: 'TaxGuard AI',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaxGuard AI | Director Financiero con IA',
    description: 'La revolución contable para PYMEs y Autónomos.',
  },
}

// 🚀 MEJORA B2B: Color de la barra de estado en móviles sincronizada con tu menú
export const viewport: Viewport = {
  themeColor: '#0f172a', // Color bg-slate-900 para que se fusione con la app en móviles
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Evita el zoom indeseado al hacer tap en inputs en iOS
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* 🚀 MEJORA B2B: Personalización del modal de Clerk sin avisos de TypeScript */}
      <ClerkProvider 
        localization={esES}
        appearance={{
          variables: { 
            colorPrimary: '#2563eb', // bg-blue-600
            colorBackground: '#ffffff',
            fontFamily: 'var(--font-inter)'
          },
          elements: { 
            card: 'shadow-2xl rounded-3xl border border-slate-100',
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 shadow-md',
            socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50',
            headerTitle: 'text-slate-900',
            headerSubtitle: 'text-slate-500',
            formFieldLabel: 'text-slate-700',
            formFieldInput: 'text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
          }
        }}
      >
        <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
          <PwaActivator />
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      </ClerkProvider>
    </html>
  );
}