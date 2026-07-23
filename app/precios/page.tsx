'use client';
import { useState } from 'react';
import Link from 'next/link';
// IMPORTAMOS LOS CONTROLES COMPLETOS DE CLERK
import { SignInButton, useUser, UserButton, SignOutButton } from "@clerk/nextjs";

export default function Precios() {
  const [loading, setLoading] = useState<string | null>(null);
  const { isSignedIn } = useUser();

  const comprarPlan = async (priceId: string) => {
    setLoading(priceId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });
      
      const data = await res.json();
      
      if (res.status === 401) {
        alert("🔒 Acceso Denegado: Tienes que iniciar sesión o crear una cuenta primero para poder suscribirte a un plan.");
      } else if (data.url) {
        window.location.href = data.url; 
      } else {
        alert(`⚠️ Error del servidor: ${data.error || 'Revisa que las variables STRIPE_SECRET_KEY estén puestas en Vercel.'}`);
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-950 p-4 selection:bg-blue-500/30 font-sans relative overflow-hidden" translate="no">
      
      <nav className="absolute top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition">
            <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-10 h-10 bg-white rounded-xl p-1 object-contain shadow-lg shadow-blue-500/20" />
            <span className="text-2xl font-black tracking-tight text-white">TaxGuard<span className="text-blue-500">AI</span></span>
          </Link>
          
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <SignOutButton>
                  <button className="text-slate-400 hover:text-white text-xs sm:text-sm font-bold transition hidden sm:block">
                    Cerrar Sesión y Volver al Inicio
                  </button>
                </SignOutButton>
                <Link href="/" className="text-slate-400 hover:text-white text-xs sm:text-sm font-bold transition px-3 sm:px-4 py-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10">
                  Ir a mi Consola
                </Link>
                <div className="bg-slate-800 p-1 rounded-full border border-slate-700 flex items-center justify-center">
                   <UserButton />
                </div>
              </>
            ) : (
              <SignInButton mode="modal">
                <button className="text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition px-4 sm:px-5 py-2.5 bg-blue-600/20 rounded-lg border border-blue-500/30 hover:bg-blue-600/40 shadow-lg shadow-blue-900/20 cursor-pointer">
                  Acceder / Crear Cuenta
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-6xl mt-32 mb-16 px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Garantía de Rentabilidad
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Menos impuestos, más beneficio.</h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Nuestros clientes ahorran una media de 30 horas al mes y cientos de euros en deducciones fiscales optimizadas por Inteligencia Artificial.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 w-full items-center md:items-stretch justify-center">
          
          <div className="bg-slate-900/40 p-8 rounded-3xl shadow-xl border border-slate-800 flex-1 flex flex-col w-full max-w-md backdrop-blur-sm hover:border-slate-700 transition">
            <h2 className="text-2xl font-bold text-white">Plan Autónomo</h2>
            <p className="text-slate-400 text-sm mt-2">Para profesionales independientes.</p>
            <div className="mt-6 mb-6 pb-6 border-b border-white/5">
              <span className="text-5xl font-black text-white">49€</span>
              <span className="text-lg text-slate-500 font-medium"> /mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3">
                 <span className="text-emerald-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium">Escáner OCR Ilimitado con IA (Sube tickets y olvídate).</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-emerald-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium">Modelos Trimestrales (303 IVA y 130 IRPF) listos para la AEAT.</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-emerald-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium">Creador de Facturas PDF y Presupuestos con tu logo.</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-emerald-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium">Libro Mayor Excel/PDF y 'Escudo 50%' para vehículos.</span>
               </li>
            </ul>
            
            <button 
              onClick={() => comprarPlan('price_1TwN2RJADsdd8EhemCpvJbef')}
              disabled={loading === 'price_1TwN2RJADsdd8EhemCpvJbef'}
              className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl border border-slate-700 hover:bg-slate-700 transition shadow-sm disabled:opacity-50"
            >
              {loading === 'price_1TwN2RJADsdd8EhemCpvJbef' ? 'Conectando...' : 'Empezar como Autónomo'}
            </button>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl border-2 border-blue-500 flex-1 flex flex-col relative transform md:-translate-y-4 w-full max-w-md">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-5 py-2 rounded-full tracking-widest shadow-lg shadow-blue-500/30">
              MÁS RECOMENDADO
            </div>
            <h2 className="text-2xl font-bold text-white">Plan Empresa Pro</h2>
            <p className="text-blue-300 text-sm mt-2 font-medium">Tu Director Financiero Virtual.</p>
            <div className="mt-6 mb-6 pb-6 border-b border-white/10">
              <span className="text-5xl font-black text-blue-400">89€</span>
              <span className="text-lg text-slate-500 font-medium"> /mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3">
                 <span className="text-blue-400 mt-0.5">✓</span>
                 <span className="text-white text-sm font-bold">Todo lo incluido en el Plan Autónomo.</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-blue-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium"><strong className="text-white">CFO Virtual y Auditorías IA:</strong> Detección automática de fugas de capital y gastos innecesarios.</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-blue-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Modelo 390 Automático:</strong> El resumen anual del IVA consolidado en un clic.</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-blue-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Simulador de Escenarios:</strong> Proyecciones de tesorería a 30 días y test de subida de precios.</span>
               </li>
               <li className="flex items-start gap-3">
                 <span className="text-blue-400 mt-0.5">✓</span>
                 <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Soporte Técnico VIP:</strong> Asistencia prioritaria integrada en la plataforma.</span>
               </li>
            </ul>
            
            <button 
              onClick={() => comprarPlan('price_1TwN54JADsdd8EheCYnGZuaZ')}
              disabled={loading === 'price_1TwN54JADsdd8EheCYnGZuaZ'}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-500 shadow-xl shadow-blue-500/20 border border-blue-400/20 transition disabled:opacity-50"
            >
              {loading === 'price_1TwN54JADsdd8EheCYnGZuaZ' ? 'Conectando...' : 'Dominar mis finanzas por 89€'}
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4">Cancela o mejora tu plan en cualquier momento.</p>
          </div>
        </div>

        <div className="mt-32 max-w-3xl mx-auto border-t border-white/5 pt-16">
           <h3 className="text-2xl font-black text-white text-center mb-10">Dudas antes de empezar</h3>
           <div className="space-y-6">
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                 <h4 className="text-white font-bold mb-2 text-sm">¿Puedo cambiar del Plan Autónomo al Pro más adelante?</h4>
                 <p className="text-slate-400 text-sm leading-relaxed">Por supuesto. Puedes hacer el upgrade desde tu panel en cualquier momento. Nuestro sistema calculará automáticamente la diferencia prorrateada (solo pagarás la parte proporcional del mes que queda).</p>
              </div>
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                 <h4 className="text-white font-bold mb-2 text-sm">¿Mis datos y facturas están seguros?</h4>
                 <p className="text-slate-400 text-sm leading-relaxed">Máxima seguridad. TaxGuard AI utiliza bases de datos aisladas y cifradas de extremo a extremo. Nadie, ni siquiera nosotros, puede leer tus reportes financieros confidenciales.</p>
              </div>
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                 <h4 className="text-white font-bold mb-2 text-sm">¿El borrador de impuestos me sirve para presentarlo de verdad?</h4>
                 <p className="text-slate-400 text-sm leading-relaxed">Sí. Nuestros PDFs de los modelos 303, 130 y 390 generan exactamente las mismas casillas numeradas que la Agencia Tributaria. Solo tienes que abrir su Sede Electrónica y copiar los valores en dos minutos.</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}