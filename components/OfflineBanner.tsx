"use client";

import { useEffect, useState } from "react";

// 🛡️ BLINDAJE DE CONEXIÓN GLOBAL: avisa de forma amable y persistente en TODA la app cuando el
// usuario pierde la conexión a internet, en vez de dejar que cada acción falle en silencio o con
// un error confuso. Se complementa con el blindaje ya existente en lib/settingsClient.ts.
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 w-full z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white transition-colors ${
        isOffline ? "bg-rose-600" : "bg-emerald-600"
      }`}
      translate="no"
    >
      {isOffline ? (
        <>📡 Sin conexión a internet. Tus cambios no se guardarán hasta que vuelvas a estar en línea.</>
      ) : (
        <>✅ Conexión restaurada. Ya puedes seguir trabajando con normalidad.</>
      )}
    </div>
  );
}
