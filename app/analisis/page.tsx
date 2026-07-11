"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function AnalisisAvanzado() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("## Análisis Preliminar\nPara iniciar la auditoría, selecciona tu empresa y pulsa el botón superior. Generaré un informe detallado con recomendaciones estratégicas.");

  useEffect(() => {
    setIsMounted(true);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || "Techmovile");
  }, []);

  if (!isMounted) return null;

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
        
        {/* BARRA LATERAL (Estética consistente) */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between h-screen`}>
           <div>
            <div className="flex items-center gap-3 mb-10">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div>
                <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
            </div>
            <nav className="space-y-1">
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 transition" href="/">Consola General</Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20" href="/analisis">Análisis Avanzado</Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 transition" href="/impuestos">Modelos Tributarios</Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 transition" href="/facturas">Facturación PDF</Link>
            </nav>
           </div>
           <div className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Entorno Seguro</span>
              <UserButton />
           </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Centro de Inteligencia</h1>
              <p className="text-slate-500 font-medium">Auditoría estratégica en tiempo real para: <span className="font-bold text-blue-600">{empresaId}</span></p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-600/20">
              Generar Nueva Auditoría
            </button>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* PANEL IZQUIERDO: PERFIL */}
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-6">Perfil Corporativo</h3>
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector Industrial</p>
                            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-medium border border-slate-100">
                                Empresa de servicios profesionales y consultoría.
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Situación Actual</p>
                            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-medium border border-slate-100">
                                Optimización de costes operativos y escalabilidad de ingresos.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: INFORME */}
            <div className="xl:col-span-2">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-full">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Documento Ejecutivo Confidencial</h2>
                            <p className="text-xs font-bold text-blue-600 uppercase mt-1">Motor de IA | TaxGuardAI Engine</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg">Informe Listo</span>
                    </div>
                    
                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                </div>
            </div>
          </div>
        </main>
      </div>
    </Show>
  );
}