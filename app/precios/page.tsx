'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Precios() {
  const [loading, setLoading] = useState<string | null>(null);

  const comprarPlan = async (priceId: string) => {
    setLoading(priceId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url; 
      } else {
        alert("⚠️ Revisa tus claves de Stripe en el archivo .env.local");
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 selection:bg-blue-500/30 font-sans relative overflow-hidden" translate="no">
      
      {/* 🚀 NAVBAR PARA PODER VOLVER AL INICIO */}
      <nav className="absolute top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition">
            <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-10 h-10 bg-white rounded-xl p-1 object-contain shadow-lg shadow-blue-500/20" />
            <span className="text-2xl font-black tracking-tight text-white">TaxGuard<span className="text-blue-500">AI</span></span>
          </Link>
          <Link href="/" className="text-slate-400 hover:text-white text-sm font-bold transition">
            Volver al Inicio
          </Link>
        </div>
      </nav>

      {/* EFECTOS DE LUZ DE FONDO (Igual que en la Landing) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl mt-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Precios Transparentes
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Elige tu Plan de TaxGuard AI</h1>
          <p className="text-lg text-slate-400">Invierte en tranquilidad. Deja que la IA maneje tus finanzas.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 w-full items-center md:items-stretch">
          
          {/* TARJETA PLAN AUTÓNOMO */}
          <div className="bg-slate-900/50 p-8 rounded-3xl shadow-xl border border-slate-800 flex-1 flex flex-col w-full max-w-md md:max-w-none backdrop-blur-sm hover:border-slate-700 transition">
            <h2 className="text-2xl font-bold text-white">Plan Autónomo Inteligente</h2>
            <div className="mt-6 mb-6">
              <span className="text-5xl font-black text-white">49€</span>
              <span className="text-lg text-slate-500 font-medium"> /mes</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed flex-grow">
              Despide a la gestoría tradicional. Escanea tus facturas con IA, genera tu Modelo 303 sin errores y emite facturas profesionales en 1 clic. Todo el control, cero papeleo.
            </p>
            
            <button 
              onClick={() => comprarPlan('price_1Tsjz1JhA316XLs0dk9307W2')}
              disabled={loading === 'price_1Tsjz1JhA316XLs0dk9307W2'}
              className="w-full mt-8 bg-slate-800 text-white font-bold py-3.5 rounded-xl border border-slate-700 hover:bg-slate-700 transition shadow-sm disabled:opacity-50"
            >
              {loading === 'price_1Tsjz1JhA316XLs0dk9307W2' ? 'Conectando con Stripe...' : 'Empezar como Autónomo'}
            </button>
          </div>

          {/* TARJETA PLAN EMPRESA PRO (DESTACADA) */}
          <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl border-2 border-blue-500 flex-1 flex flex-col relative transform md:-translate-y-4 w-full max-w-md md:max-w-none">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest shadow-lg shadow-blue-500/30">
              MÁS RECOMENDADO
            </div>
            <h2 className="text-2xl font-bold text-white">Plan Empresa Pro</h2>
            <div className="mt-6 mb-6">
              <span className="text-5xl font-black text-blue-400">89€</span>
              <span className="text-lg text-slate-500 font-medium"> /mes</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed flex-grow font-medium">
              Tu Director Financiero en piloto automático. Incluye todo lo del plan básico MÁS auditorías de gastos con IA en tiempo real, alertas de liquidez y detección de fugas de capital.
            </p>
            
            <button 
              onClick={() => comprarPlan('price_1Tsk0EJhA316XLs049Nl6hka')}
              disabled={loading === 'price_1Tsk0EJhA316XLs049Nl6hka'}
              className="w-full mt-8 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-500 shadow-xl shadow-blue-500/20 border border-blue-400/20 transition disabled:opacity-50"
            >
              {loading === 'price_1Tsk0EJhA316XLs049Nl6hka' ? 'Conectando con Stripe...' : 'Dominar mis finanzas'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}