"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs"; 
import Link from 'next/link';

export default function AnalisisAvanzado() {
  const [data, setData] = useState<any[]>([]); 
  const [aiAnalysis, setAiAnalysis] = useState("Esperando orden para iniciar auditoría profunda...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [sectorEmpresa, setSectorEmpresa] = useState("");
  const [detallesEmpresa, setDetallesEmpresa] = useState("");

  useEffect(() => {
    fetch('/api/finances')
      .then(res => res.ok ? res.json() : [])
      .then(d => {
        if (d && d.length > 0) setData(d);
      });

    setNombreEmpresa(localStorage.getItem('taxguard_nombre') || "");
    setSectorEmpresa(localStorage.getItem('taxguard_sector') || "");
    setDetallesEmpresa(localStorage.getItem('taxguard_detalles') || "");
  }, []);

  const generarReporteCFO = () => {
    if (data.length < 2) {
      alert("Se necesitan al menos 2 movimientos registrados para un análisis profundo.");
      return;
    }

    localStorage.setItem('taxguard_nombre', nombreEmpresa);
    localStorage.setItem('taxguard_sector', sectorEmpresa);
    localStorage.setItem('taxguard_detalles', detallesEmpresa);
    
    setIsAnalyzing(true);
    setAiAnalysis("Recopilando el historial... Conectando con el motor de IA... Evaluando contexto de la empresa...");
    
    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
        data: data, 
        context: { nombre: nombreEmpresa, sector: sectorEmpresa, detalles: detallesEmpresa } 
      }),
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

  // 🆕 Función para lanzar la impresión / guardado en PDF del navegador
  const exportarPDF = () => {
    window.print();
  };

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-slate-50 font-sans print:bg-white">
        
        {/* SIDEBAR: Oculto al imprimir (print:hidden) */}
        <aside className="w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0 print:hidden">
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

        {/* MAIN: Ajustamos para que al imprimir ocupe todo y no haya scroll */}
        <main className="flex-1 flex flex-col p-10 h-screen overflow-hidden print:p-0 print:h-auto print:overflow-visible">
          
          {/* HEADER: Oculto al imprimir */}
          <header className="flex justify-between items-end mb-8 border-b border-slate-200 pb-6 shrink-0 print:hidden">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Evaluación completa y personalizada por IA.</p>
            </div>
            
            <div className="flex gap-3">
              {/* 🆕 NUEVO BOTÓN DE PDF */}
              <button 
                onClick={exportarPDF} 
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-xl transition shadow-sm flex items-center gap-2 text-sm"
              >
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9h1.5m1.5 0h1.5m-1.5 4h.01M9 13h.01M15 13h.01M9 17h6" /></svg>
                Descargar PDF
              </button>
              
              <button 
                onClick={generarReporteCFO} 
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {isAnalyzing ? "Procesando Auditoría..." : "Generar Nueva Auditoría"}
              </button>
            </div>
          </header>

          <div className="flex-1 flex gap-8 overflow-hidden print:overflow-visible print:block">
            
            {/* FORMULARIO: Oculto al imprimir */}
            <div className="w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col shrink-0 print:hidden">
              <h3 className="text-md font-bold text-slate-900 mb-1">Perfil Corporativo</h3>
              <p className="text-xs text-slate-400 mb-6">Personaliza el contexto para el análisis.</p>
              
              <div className="space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre Comercial</label>
                  <input type="text" placeholder="Ej: TechStore Inc." value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sector Industrial</label>
                  <input type="text" placeholder="Ej: E-commerce de tecnología" value={sectorEmpresa} onChange={(e) => setSectorEmpresa(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Situación Actual / Objetivos</label>
                  <textarea placeholder="Ej: Buscamos reducir costes operativos este trimestre..." value={detallesEmpresa} onChange={(e) => setDetallesEmpresa(e.target.value)} rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" />
                </div>
              </div>
            </div>

            {/* REPORTE: Al imprimir, ocupa el 100% del folio, sin bordes ni sombras */}
            <div className="w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col print:w-full print:border-none print:shadow-none print:block">
              
              {/* CABECERA DOCUMENTO */}
              <div className="bg-slate-50 border-b border-slate-100 p-4 px-8 shrink-0 flex items-center justify-between print:bg-white print:border-b-2 print:border-slate-900 print:mb-8 print:p-0 print:pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 hidden print:block mb-1">{nombreEmpresa || "Auditoría Financiera"}</h2>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Documento Ejecutivo Confidencial</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 block">TaxGuard AI Engine</span>
                  <span className="text-xs font-bold text-blue-600 hidden print:block mt-1">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* CONTENIDO DEL REPORTE */}
              <div className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0">
                <div className="text-slate-700 text-base font-medium leading-relaxed prose prose-blue max-w-none
                  [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-slate-900 [&>h2]:mb-6 [&>h2]:mt-8
                  [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-slate-800 [&>h3]:mb-4 [&>h3]:mt-6
                  [&>p]:mb-6 
                  [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-6
                  [&>li]:mb-2
                  [&>strong]:text-slate-900 [&>strong]:font-bold">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              </div>

              {/* PIE DE PÁGINA: Solo visible al imprimir */}
              <div className="hidden print:block mt-12 pt-6 border-t border-slate-200 text-center text-xs font-medium text-slate-400">
                Generado automáticamente por TaxGuard AI • Análisis basado en los datos financieros registrados.
              </div>

            </div>

          </div>
        </main>
      </div>
    </Show>
  );
}