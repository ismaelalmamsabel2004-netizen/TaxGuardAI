'use client';

import Link from 'next/link';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import RegisterConsentForm from '@/components/legal/RegisterConsentForm';

export default function RegistroPage() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 relative overflow-hidden"
      translate="no"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] opacity-60 pointer-events-none" />

      <nav className="relative z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition">
            <img
              src="/icon-192x192.png"
              alt="TaxGuard AI"
              className="w-8 h-8 bg-white rounded-lg p-0.5 object-contain"
            />
            <span className="text-lg font-black tracking-tight text-white">
              TaxGuard<span className="text-blue-500">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer">
                  Ya tengo cuenta
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link href="/" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition">
                Ir a la Consola →
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-lg mx-auto px-6 py-14 sm:py-20">
        <Show when="signed-out">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">
            Registro B2B · Cumplimiento RGPD
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Crear cuenta en TaxGuard AI
          </h1>
          <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
            Antes de activar el registro debe aceptar los documentos legales. TaxGuard AI es una
            herramienta de asistencia: la revisión fiscal y la presentación ante Hacienda son
            responsabilidad exclusiva del usuario.
          </p>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 shadow-2xl">
            <RegisterConsentForm ctaLabel="Crear Cuenta" variant="dark" />
          </div>

          <p className="mt-6 text-center text-xs text-slate-500 font-medium">
            Al continuar también reconoce nuestro{' '}
            <Link href="/legal/notice" className="text-slate-400 hover:text-white underline-offset-2 hover:underline">
              Aviso Legal
            </Link>
            . Planes desde 49 €/mes ·{' '}
            <Link href="/precios" className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline">
              Ver precios
            </Link>
            .
          </p>
        </Show>

        <Show when="signed-in">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <h1 className="text-2xl font-black text-white mb-2">Ya tienes sesión iniciada</h1>
            <p className="text-sm text-slate-300 mb-6">
              Puedes ir a tu consola o elegir un plan de suscripción.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition"
              >
                Ir a la Consola
              </Link>
              <Link
                href="/precios"
                className="inline-flex justify-center bg-white/10 hover:bg-white/15 text-white font-bold px-6 py-3 rounded-xl border border-white/10 transition"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
