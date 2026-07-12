"use client";

import { useEffect } from 'react';

export default function PwaActivator() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('🚀 TaxGuard AI PWA activada con éxito'))
        .catch((err) => console.error('Fallo al registrar PWA:', err));
    }
  }, []);

  return null; // Es un componente invisible, no afecta al diseño
}