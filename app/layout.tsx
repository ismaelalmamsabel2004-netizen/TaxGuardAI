import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { useEffect } from 'react';

// Pon esto dentro de tu componente principal en layout.tsx:
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('🚀 TaxGuard AI PWA activada con éxito'))
      .catch((err) => console.error('Fallo al registrar PWA:', err));
  }
}, []);

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'TaxGuard AI | Intelligent Tax Analysis',
  description: 'AI-powered tax analysis and VAT recovery for businesses. Securely analyze invoices and optimize your fiscal health.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
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
    <html lang="en" suppressHydrationWarning>
      <ClerkProvider>
        <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </body>
      </ClerkProvider>
    </html>
  );
}