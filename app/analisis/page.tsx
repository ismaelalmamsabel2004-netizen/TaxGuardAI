"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs"; 
import Link from 'next/link';

export default function AnalisisAvanzado() {
  const [data, setData] = useState<any[]>([]); 
  const [aiAnalysis, setAiAnalysis] = useState("Esperando orden para iniciar auditoría profunda...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Solo descargamos los datos, no forzamos a la IA a hablar todavía
    fetch('/api/finances')
      .then(res => res.ok ? res.json() : [])
      .then(d => {
        if (d && d.length > 0) setData(d);
      });
  }, []);

  const generarReporteCFO = () => {
    if (data.length < 2) {
      alert("Se necesitan al menos 2 movimientos registrados para un análisis profundo.");
      return;
    }
    
    setIsAnalyzing(true);
    setAiAnalysis("Recopilando todo el historial... Procesando patrones de gasto e ingresos... Generando proyecciones de flujo de caja...");
    
    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: data }),
    })
      .then(r => r.json())
      .then(r => {
        setAiAnalysis(r.analysis || "Error al estructurar el reporte.");
        setIsAnalyzing(false);
      })
      .catch(() => {
        setAiAnalysis("Error en la conexión con el motor de IA.");
        setIsAnalyzing(false);
      });
  };

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-slate-50 font-sans">
        
        {/* SIDEBAR (Con los enlaces reales funcionando) */}
        <aside className="w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">T</div>
              <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
            </div>
            
            <nav className="space-y-1">
              <Link href="/" className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                Consola General
              </Link>
              <Link href="/analisis" className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium transition shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Análisis Avanzado
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
            <UserButton />
          </div>
        </aside>

        {/* ÁREA DE TRABAJO PRINCIPAL */}
        <main className="flex-1 flex flex-col p-10 h-screen overflow-hidden">
          
          <header className="flex justify-between items-end mb-8 border-b border-slate-200 pb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Evaluación completa del estado financiero por IA.</p>
            </div>
            <button 
              onClick={generarReporteCFO} 
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Procesando Datos...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Ejecutar Auditoría Global
                </>
              )}
            </button>
          </header>

          {/* LIENZO DEL INFORME */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-100 p-4 px-8 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Documento Ejecutivo Confidencial</span>
              <span className="text-xs font-semibold text-slate-400">TaxGuard AI Engine v2.0</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12">
              <div className="max-w-4xl mx-auto text-slate-700 text-base font-medium leading-relaxed prose prose-blue 
                [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-slate-900 [&>h2]:mb-6 [&>h2]:mt-10
                [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-slate-800 [&>h3]:mb-4 [&>h3]:mt-8
                [&>p]:mb-6 
                [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-6
                [&>li]:mb-2
                [&>strong]:text-slate-900 [&>strong]:font-bold">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>
            </div>
          </div>

        </main>
      </div>
    </Show>
  );
}