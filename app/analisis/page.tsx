"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function AnalisisAvanzado() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [perfilEmpresa, setPerfilEmpresa] = useState({ sector: "", objetivo: "" });
  
  const [data, setData] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState("## Análisis Preliminar\nPara iniciar la auditoría, asegúrate de tener datos registrados en el Libro Mayor y pulsa el botón superior **Generar Nueva Auditoría**.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cargamos datos desde la nueva base de datos en la nube
  useEffect(() => {
    setIsMounted(true);

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((ajustesGuardados: any) => {
         const listaEmpresas = ajustesGuardados.empresas || ["Alperez", "PetClean", "Techmovile"];
         setEmpresas(listaEmpresas);
         
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);

         if (activa && ajustesGuardados.perfiles && ajustesGuardados.perfiles[activa]) {
            setPerfilEmpresa(ajustesGuardados.perfiles[activa]);
         } else {
            setPerfilEmpresa({ sector: "No definido", objetivo: "No definido" });
         }

         if (activa) {
           fetch(`/api/finances?empresaId=${activa}&t=${Date.now()}`)
             .then(res => res.ok ? res.json() : [])
             .then(d => setData(d))
             .catch(err => console.error("Error cargando finanzas:", err));
         }
      });
  }, []);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    setEmpresaId(nuevaEmpresa);
    setAiAnalysis("## Análisis Preliminar\nHas cambiado de empresa. Pulsa **Generar Nueva Auditoría** para analizar este nuevo espacio de trabajo.");
    
    // Guardar el cambio de empresa activa en la nube
    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actuales, empresaActiva: nuevaEmpresa })
    });

    if (actuales.perfiles && actuales.perfiles[nuevaEmpresa]) {
       setPerfilEmpresa(actuales.perfiles[nuevaEmpresa]);
    } else {
       setPerfilEmpresa({ sector: "No definido", objetivo: "No definido" });
    }

    fetch(`/api/finances?empresaId=${nuevaEmpresa}&t=${Date.now()}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setData(d));
  };

  const generarAuditoria = async () => {
    if (data.length === 0) {
      setAiAnalysis("⚠️ **Datos insuficientes.**\n\nNo hay transacciones en este Espacio de Trabajo. Por favor, añade ingresos o gastos en la Consola General para poder generar una auditoría.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis("⏳ **Conectando con el CFO Virtual...**\n\nAnalizando flujos de caja, identificando patrones de gasto y calculando proyecciones basadas en tu sector corporativo. Esto puede tardar unos segundos...");

    const datosLimpios = data.map(d => ({
      fecha: d.name,
      categoria: d.categoria || 'General',
      importe: d.total,
      iva_aplicado: d.iva ? `${d.iva}%` : 'Exento',
      tipo: d.isRecurrent ? `Recurrente (${d.frecuencia})` : 'Puntual'
    }));

    const contextoEmpresarial = `Sector de la empresa: ${perfilEmpresa.sector || 'General'}. Objetivo Principal de la directiva: ${perfilEmpresa.objetivo || 'Estabilidad financiera'}.`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ data: datosLimpios, empresaId, contextoSector: contextoEmpresarial }), 
      });
      const json = await res.json();
      setAiAnalysis(json.analysis || "❌ Error al estructurar el reporte de IA.");
    } catch (error) {
      setAiAnalysis("❌ Error de conexión con el motor de Inteligencia Artificial.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isMounted) return null;

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
        
        {/* 🚀 CABECERA MÓVIL CON ESCUDO */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
          <div className="flex items-center gap-2">
             <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-8 h-8 bg-white rounded-lg p-1 object-contain" />
             <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out`}>
          <div>
            <div className="flex items-center justify-between mb-10 px-2 mt-4 lg:mt-0">
              {/* 🚀 MENÚ LATERAL CON ESCUDO */}
              <div className="flex items-center gap-3">
                <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-9 h-9 bg-white rounded-xl p-1 object-contain shadow-md shadow-blue-500/20" />
                <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
              </div>
              <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
           
            <div className="mb-6 px-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
              <select value={empresaId} onChange={(e) => cambiarEmpresa(e.target.value)} className="w-full mt-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 transition">
                  {empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
           
            <nav className="space-y-1">
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                Consola General
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Análisis Avanzado
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/impuestos" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Modelos Tributarios
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/facturas" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Facturación PDF
              </Link>
            </nav>
          </div>
         
          <div className="mt-auto">
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
              <UserButton/>
            </div>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
          <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 border-b border-slate-200 pb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Evaluación completa y personalizada para <span className="font-bold text-blue-600">{empresaId}</span>.</p>
            </div>
            <button onClick={generarAuditoria} disabled={isAnalyzing} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2">
              {isAnalyzing ? "⏳ Analizando datos..." : "✨ Generar Nueva Auditoría"}
            </button>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                      <h3 className="text-base md:text-lg font-black text-slate-900">Perfil Corporativo</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-6 pb-4 border-b border-slate-100">
                      Contexto utilizado por la IA para enfocar el análisis estratégico. Configurable desde la Consola General.
                    </p>
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector Industrial</p>
                            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-semibold border border-slate-200">
                                {perfilEmpresa.sector || "No definido"}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Situación Actual / Objetivos</p>
                            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-semibold border border-slate-200">
                                {perfilEmpresa.objetivo || "No definido"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="xl:col-span-2">
                <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm h-full">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900">Documento Ejecutivo Confidencial</h2>
                            <p className="text-xs font-bold text-blue-600 uppercase mt-2 tracking-wide">MOTOR DE IA | ENGINE TAXGUARDAI</p>
                        </div>
                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg border flex items-center gap-2 ${isAnalyzing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                           {isAnalyzing ? <><span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></span> PROCESANDO</> : <><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> INFORME LISTO</>}
                        </span>
                    </div>
                    
                    <div className="text-slate-700 prose prose-sm md:prose-base prose-slate prose-headings:font-black prose-h2:text-blue-900 prose-h3:text-slate-800 prose-p:text-slate-700 prose-p:font-medium prose-strong:text-slate-900 prose-li:font-medium max-w-none">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                </div>
            </div>
          </div>
          <div className="h-10"></div>
        </main>
      </div>
    </Show>
  );
}