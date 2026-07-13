'use client';
import { useState } from 'react';

export default function Precios() {
  const [loading, setLoading] = useState<string | null>(null);

  // Esta es la función mágica que llama a tu servidor y nos manda a Stripe
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
        window.location.href = data.url; // 🚀 Redirección segura a la pasarela de pago
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2 text-center">Elige tu Plan de TaxGuard AI</h1>
      <p className="text-lg text-gray-500 mb-10 text-center">Invierte en tranquilidad. Deja que la IA maneje tus finanzas.</p>
      
      <div className="flex flex-col md:flex-row gap-8 max-w-5xl w-full">
        
        {/* TARJETA PLAN AUTÓNOMO */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 flex-1 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-800">Plan Autónomo Inteligente</h2>
          <p className="text-5xl font-extrabold text-gray-900 mt-4">49€ <span className="text-lg text-gray-500 font-normal">/mes</span></p>
          <p className="mt-4 text-gray-600 flex-grow">Despide a la gestoría tradicional. Escanea tus facturas con IA, genera tu Modelo 303 sin errores y emite facturas profesionales en 1 clic. Todo el control, cero papeleo.</p>
          
          <button 
            onClick={() => comprarPlan('price_1Tsjz1JhA316XLs0dk9307W2')}
            disabled={loading === 'price_1Tsjz1JhA316XLs0dk9307W2'}
            className="w-full mt-8 bg-blue-100 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-200 transition duration-300"
          >
            {loading === 'price_1Tsjz1JhA316XLs0dk9307W2' ? 'Conectando...' : 'Empezar como Autónomo'}
          </button>
        </div>

        {/* TARJETA PLAN EMPRESA PRO (DESTACADA) */}
        <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-2xl border-2 border-blue-500 flex-1 flex flex-col relative transform md:-translate-y-4">
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-xl tracking-wider">
            RECOMENDADO
          </div>
          <h2 className="text-2xl font-bold">Plan Empresa Pro</h2>
          <p className="text-5xl font-extrabold mt-4">89€ <span className="text-lg text-gray-400 font-normal">/mes</span></p>
          <p className="mt-4 text-gray-300 flex-grow">Tu Director Financiero en piloto automático. Incluye todo lo del plan básico MÁS auditorías de gastos con IA en tiempo real, alertas de liquidez y detección de fugas de capital.</p>
          
          <button 
            onClick={() => comprarPlan('price_1Tsk0EJhA316XLs049Nl6hka')}
            disabled={loading === 'price_1Tsk0EJhA316XLs049Nl6hka'}
            className="w-full mt-8 bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 shadow-lg hover:shadow-blue-500/30 transition duration-300"
          >
            {loading === 'price_1Tsk0EJhA316XLs049Nl6hka' ? 'Conectando...' : 'Dominar mis finanzas'}
          </button>
        </div>

      </div>
    </div>
  );
}