"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import Link from 'next/link';

export default function Analisis() {
  const [isMounted, setIsMounted] = useState(false);
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

    const activa = localStorage.getItem('taxguard_empresaActiva') || lista[0] || "";
    setEmpresaId(activa);
  }, []);

  useEffect(() => {
    if (!empresaId) return;

    // Cargar perfil
    const perfilesGuardados = localStorage.getItem('taxguard_perfiles');
    if (perfilesGuardados) {
      const perfiles = JSON.parse(perfilesGuardados);
      if (perfiles[empresaId]) {
        setPerfilEmpresa(perfiles[empresaId]);
      } else {
        setPerfilEmpresa({ sector: "No configurado", objetivo: "No configurado" });
      }
    }

    // Cargar datos financieros de esta empresa
    fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`)
      .then(res => res.ok ? res.json() : [])
      .then(d => setDatosVisibles(d || []));

    setAiAnalysis("Esperando orden para iniciar auditoría profunda...");
  }, [empresaId]);

  const pedirAnalisisGemini = () => {
    if (datosVisibles.length < 2) {
      setAiAnalysis("❌ **Error:** No hay suficientes transacciones en el Libro Mayor de esta empresa para generar un informe profesional.");
      return;
    }
    setIsAnalyzing(true);
    setAiAnalysis("⏳ Analizando miles de puntos de datos y calculando proyecciones financieras...");
    
    const datosLimpios = datosVisibles.map(d => ({
      fecha: d.name,
      categoria: d.categoria || 'General',
      importe: d.total,
      iva_aplicado: d.iva ? `${d.iva}%` : 'Exento',
      tipo: d.isRecurrent ? `Recurrente (${d.frecuencia})` : 'Puntual'
    }));

    const contextoEmpresarial = `Sector: ${perfilEmpresa.sector}. Objetivo Principal: ${perfilEmpresa.objetivo}.`;

    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: datosLimpios, empresaId, contextoSector: contextoEmpresarial }), 
    })
      .then(r => r.json())
      .then(r => setAiAnalysis(r.analysis || "Error al estructurar el reporte."))
      .catch(() => setAiAnalysis("Error en el servidor de inteligencia artificial."))
      .finally(() => setIsAnalyzing(false));
  };

  const imprimirPDF = () => {
    window.print();
  };

  if (!isMounted) return null;

  return (
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-slate-50 font-sans print:bg-white">
         
          {/* BARRA LATERAL (Se oculta al imprimir con print:hidden) */}
          <aside className="w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0 print:hidden">
            <div>
              <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">T</div>
                <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
              </div>
             
              <div className="mb-6 px-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
                <div className="flex gap-2 mt-1">
                    <select 
                      value={empresaId} 
                      onChange={(e) => {
                        setEmpresaId(e.target.value);
                        localStorage.setItem('taxguard_empresaActiva', e.target.value);
                      }} 
                      className="w-full bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none"
                    >
                        {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
              </div>
             
              <nav className="space-y-1">
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium transition shadow-sm" href="/analisis">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
                </Link>
              </nav>
            </div>
           
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
              <UserButton/>
            </div>
          </aside>

          <main className="flex-1 p-10 overflow-y-auto w-full print:p-0">
           
            <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-200 pb-6 print:border-b-2 print:border-slate-900">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
                <p className="text-sm font-medium text-slate-500 mt-1 print:text-slate-800">Evaluación completa y personalizada por IA para <span className="font-bold text-blue-600">{empresaId}</span>.</p>
              </div>
              
              <div className="flex items-center gap-3 mt-4 md:mt-0 print:hidden">
                <button onClick={imprimirPDF} className="flex items-center gap-2 bg-white border border-slate-200 text-rose-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-50 hover:border-rose-200 transition shadow-sm">
                  📄 Descargar PDF
                </button>
                <button onClick={pedirAnalisisGemini} disabled={isAnalyzing} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50">
                  {isAnalyzing ? "Generando..." : "Generar Nueva Auditoría"}
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Columna Izquierda: Detalles del Perfil */}
               <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
                  <h3 className="text-lg font-black text-slate-900 mb-1">Perfil Corporativo</h3>
                  <p className="text-xs text-slate-500 font-medium mb-6">Contexto utilizado para el análisis.</p>
                  
                  <div className="space-y-5">
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Comercial</label>
                        <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-800 font-semibold text-sm">
                           {empresaId}
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sector Industrial</label>
                        <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-800 font-semibold text-sm">
                           {perfilEmpresa.sector || "No especificado"}
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Situación Actual / Objetivos</label>
                        <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-800 font-semibold text-sm min-h-[100px]">
                           {perfilEmpresa.objetivo || "No especificado"}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Columna Derecha: Documento Generado */}
               <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 print:shadow-none print:border-none print:p-0">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Ejecutivo Confidencial</h3>
                     <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">Motor de IA de TaxGuard</span>
                  </div>
                  
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium">
                     <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>

                  <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center opacity-50 print:flex">
                      <span className="text-[10px] font-bold">Generado por TaxGuard AI</span>
                      <span className="text-[10px] font-bold">Fecha: {new Date().toLocaleDateString()}</span>
                  </div>
               </div>
            </div>

          </main>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
          <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">TaxGuard<span className="text-blue-600">AI</span></h2>
            <SignInButton mode="modal"><button className="w-full bg-slate-950 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 text-sm mt-8 shadow-xl shadow-slate-900/20">Autenticar Acceso</button></SignInButton>
          </div>
        </div>
      </Show>
    </>
  );
}