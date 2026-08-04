"use client";

import { useEffect } from "react";

// 🛡️ ÚLTIMA RED DE SEGURIDAD: se activa solo si el error ocurre en el propio layout raíz
// (ej: si fallara el propio ClerkProvider). Por eso debe pintar su propio <html>/<body>: en este
// caso concreto, ni siquiera el layout principal de la app sigue en pie.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("🔴 Error crítico capturado por la red de seguridad global (layout raíz):", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F4F5F7",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.08)",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>⚠️</div>
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
              Vaya, algo ha ido mal
            </h1>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748b", marginBottom: "24px", lineHeight: 1.5 }}>
              TaxGuard AI no ha podido cargar correctamente. Tus datos están seguros; prueba a recargar la página.
            </p>
            <button
              onClick={() => reset()}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
              }}
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
