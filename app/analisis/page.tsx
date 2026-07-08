"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import Link from 'next/link';

export default function Analisis() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [perfilEmpresa, setPerfilEmpresa] = useState({ sector: "No configurado", objetivo: "No configurado" });
  
  const [aiAnalysis, setAiAnalysis] = useState("Esperando orden para iniciar auditoría profunda...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [datosVisibles, setDatosVisibles] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const guardadas = localStorage.getItem('taxguard_empresas');
    const lista = guardadas ? JSON.parse(guardadas) : ["Alperez"];
    setEmpresas(lista);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || lista[0] || "");
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    const perfilesGuardados = localStorage.getItem('taxguard_perfiles');
    if (perfilesGuardados) {
      const perfiles = JSON.parse(perfilesGuardados);
      if (perfiles[empresaId]) {
        setPerfilEmpresa(perfiles[empresaId]);
      }
    }
    fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`)
      .then(res => res.ok ? res.json() : [])
      .then(d => setDatosVisibles(d || []));
  }, [empresaId]);

  const pedirAnalisisGemini = () => {
    if (datosVisibles.length < 2) return setAiAnalysis("❌ No hay suficientes transacciones.");
    setIsAnalyzing(true);
    setAiAnalysis("⏳ Analizando datos...");
    const datosLimpios = datosVisibles.map(d => ({ fecha: d.name, categoria: d.categoria, importe: d.total, iva: d.iva }));
    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: datosLimpios, empresaId, contextoSector: `Sector: ${perfilEmpresa.sector}` }), 
    }).then(r => r.json()).then(r => setAiAnalysis(r.analysis)).finally(() => setIsAnalyzing(false));
  };

  if (!isMounted) return null;

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-slate-50 font-sans relative print:bg-white" translate="no">
        
        <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40 print:hidden">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div>
             <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out print:hidden`}>
          <div>
            <div className="flex items-center justify-between mb-10 px-2 mt-4 lg:mt-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg">T</div>
                <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
              </div>
              <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
           
            <div className="mb-6 px-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
              <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full mt-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none">
                  {empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
           
            <nav className="space-y-1">
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/">Consola General</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium shadow-sm" href="/analisis">Análisis Avanzado</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/impuestos">Modelos Tributarios</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/facturas">Facturación PDF</Link>
            </nav>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
            <UserButton/>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full print:p-0 relative">
          <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-200 pb-6 print:border-b-2 print:border-slate-900 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Evaluación personalizada para <span className="font-bold text-blue-600">{empresaId}</span>.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto print:hidden">
              <button onClick={() => window.print()} className="bg-white border border-slate-200 text-rose-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-50 shadow-sm">📄 Descargar PDF</button>
              <button onClick={pedirAnalisisGemini} disabled={isAnalyzing} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md disabled:opacity-50">{isAnalyzing ? "Generando..." : "Generar Nueva Auditoría"}</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
                <h3 className="text-lg font-black text-slate-900 mb-1">Perfil Corporativo</h3>
                <div className="space-y-5 mt-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sector Industrial</label>
                      <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800">{perfilEmpresa.sector || "No especificado"}</div>
                   </div>
                </div>
             </div>
             <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl print:p-0 print:border-none print:shadow-none">
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium"><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>
             </div>
          </div>
        </main>
      </div>
    </Show>
  );
}