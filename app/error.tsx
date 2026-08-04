"use client";

import { useEffect } from "react";
import Link from "next/link";

// 🛡️ RED DE SEGURIDAD GLOBAL: Next.js renderiza esta pantalla en vez de la "pantalla blanca de la
// muerte" cuando cualquier error inesperado rompe el renderizado de una página. Sin este archivo,
// el usuario se queda sin ninguna explicación ni forma de recuperarse.
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("🔴 Error capturado por la red de seguridad global:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6" translate="no">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-6 text-3xl">
          ⚠️
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Vaya, algo ha ido mal</h1>
        <p className="text-sm font-medium text-slate-500 mb-1 leading-relaxed">
          Ha ocurrido un error inesperado al cargar esta pantalla.
        </p>
        <p className="text-sm font-bold text-emerald-600 mb-6">
          Tranquilo: tus datos están seguros y no se ha perdido nada.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            🔄 Reintentar
          </button>
          <Link
            href="/"
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition border border-slate-200 flex items-center justify-center"
          >
            Ir a la Consola General
          </Link>
        </div>

        <p className="text-[11px] font-medium text-slate-400 mt-6">
          Si el problema persiste, escríbenos a{" "}
          <a href="mailto:soporte.taxguard@gmail.com" className="font-bold text-slate-500 hover:text-blue-600 underline">
            soporte.taxguard@gmail.com
          </a>
          {error.digest && <> · Código de referencia: <span className="font-mono">{error.digest}</span></>}
        </p>
      </div>
    </div>
  );
}
