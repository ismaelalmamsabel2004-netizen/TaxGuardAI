import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import PwaActivator from './PwaActivator'
import { esES } from '@clerk/localizations';

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'TaxGuard AI | Director Financiero con Inteligencia Artificial',
  description: 'Automatiza tu contabilidad, escanea facturas al instante y genera los modelos oficiales de Hacienda sin depender de terceros. El control total de tu rentabilidad en tiempo real.',
  generator: 'Next.js',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#121212',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <ClerkProvider localization={esES}>
        <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
          <PwaActivator />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </body>
      </ClerkProvider>
    </html>
  );
}