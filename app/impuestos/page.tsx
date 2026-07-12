"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';

export default function ModelosTributarios() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);

  // 🚀 ESTADOS FISCALES
  const [trimestre, setTrimestre] = useState("1T");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());

  // 🚀 SINCRONIZACIÓN CON LA NUBE
  useEffect(() => {
    setIsMounted(true);
    
    const mesActual = new Date().getMonth() + 1;
    if (mesActual <= 3) setTrimestre("1T");
    else if (mesActual <= 6) setTrimestre("2T");
    else if (mesActual <= 9) setTrimestre("3T");
    else setTrimestre("4T");

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((ajustesGuardados: any) => {
         const listaEmpresas = ajustesGuardados.empresas || ["Alperez"];
         setEmpresas(listaEmpresas);
         
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);

         if (activa) {
           fetch(`/api/finances?empresaId=${activa}&t=${Date.now()}`)
             .then(res => res.ok ? res.json() : [])
             .then(d => setData(d));
         }
      });
  }, []);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    setEmpresaId(nuevaEmpresa);
    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actuales, empresaActiva: nuevaEmpresa })
    });

    fetch(`/api/finances?empresaId=${nuevaEmpresa}&t=${Date.now()}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setData(d));
  };

  // 🚀 MOTOR MATEMÁTICO DEL MODELO 303
  const calcularModelo303 = () => {
    const datosTrimestre = data.filter(d => {
      const [dia, mesStr, anioStr] = d.name.split('/');
      if (anioStr !== anio) return false;
      
      const m = Number(mesStr);
      if (trimestre === '1T') return m >= 1 && m <= 3;
      if (trimestre === '2T') return m >= 4 && m <= 6;
      if (trimestre === '3T') return m >= 7 && m <= 9;
      if (trimestre === '4T') return m >= 10 && m <= 12;
      return false;
    });

    const ingresos = datosTrimestre.filter(d => Number(d.total) > 0);
    const gastos = datosTrimestre.filter(d => Number(d.total) < 0);

    const base21 = ingresos.filter(i => Number(i.iva) === 21).reduce((acc, curr) => acc + Number(curr.total), 0);
    const cuota21 = base21 * 0.21;

    const base10 = ingresos.filter(i => Number(i.iva) === 10).reduce((acc, curr) => acc + Number(curr.total), 0);
    const cuota10 = base10 * 0.10;

    const base4 = ingresos.filter(i => Number(i.iva) === 4).reduce((acc, curr) => acc + Number(curr.total), 0);
    const cuota4 = base4 * 0.04;

    const totalCuotaDevengada = cuota21 + cuota10 + cuota4;

    const baseDeducible = gastos.reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuotaDeducible = gastos.reduce((acc, curr) => {
       const tipoIva = Number(curr.iva) || 0;
       return acc + (Math.abs(Number(curr.total)) * (tipoIva / 100));
    }, 0);

    const resultado = totalCuotaDevengada - cuotaDeducible;

    return {
      base21, cuota21, base10, cuota10, base4, cuota4,
      totalCuotaDevengada, baseDeducible, cuotaDeducible, resultado
    };
  };

  const mod303 = calcularModelo303();

  const descargarInforme = () => {
    const texto = `MODELO 303 - BORRADOR\nEmpresa: ${empresaId}\nPeriodo: ${trimestre} ${anio}\n\nIVA DEVENGADO (Ingresos)\n- Base 21%: ${mod303.base21.toFixed(2)} € | Cuota: ${mod303.cuota21.toFixed(2)} €\n- Base 10%: ${mod303.base10.toFixed(2)} € | Cuota: ${mod303.cuota10.toFixed(2)} €\n- Base 4%: ${mod303.base4.toFixed(2)} € | Cuota: ${mod303.cuota4.toFixed(2)} €\nTOTAL DEVENGADO: ${mod303.totalCuotaDevengada.toFixed(2)} €\n\nIVA DEDUCIBLE (Gastos)\n- Base: ${mod303.baseDeducible.toFixed(2)} € | Cuota: ${mod303.cuotaDeducible.toFixed(2)} €\n\nRESULTADO LIQUIDACIÓN: ${mod303.resultado.toFixed(2)} €`;
    const blob = new Blob([texto], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Borrador_Mod303_${empresaId}_${trimestre}_${anio}.txt`;
    link.click();
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
              <select 
                 value={empresaId} 
                 onChange={(e) => cambiarEmpresa(e.target.value)} 
                 className="w-full mt-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none"
              >
                  {empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
           
            <nav className="space-y-1">
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                Consola General
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Análisis Avanzado
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/impuestos" onClick={() => setIsSidebarOpen(false)}>
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
          
          <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-10 gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modelos Oficiales</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Gestión fiscal inteligente lista para copiar y pegar en Hacienda.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
               <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                  {['1T', '2T', '3T', '4T'].map(t => (
                     <button 
                        key={t}
                        onClick={() => setTrimestre(t)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition ${trimestre === t ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        {t}
                     </button>
                  ))}
               </div>
               
               <select 
                  value={anio} 
                  onChange={(e) => setAnio(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm outline-none"
               >
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <button onClick={descargarInforme} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descargar Borrador
               </button>
            </div>
          </header>

          <div className="max-w-4xl mx-auto">
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-orange-500 p-6 md:p-8 text-white">
                   <h2 className="text-2xl font-black tracking-tight">Modelo 303</h2>
                   <p className="font-medium text-orange-100 mt-1">Borrador interno calculado en tiempo real para <strong>{empresaId}</strong></p>
                </div>

                <div className="p-6 md:p-10 space-y-10">
                   
                   <section>
                      <h3 className="text-sm font-black text-orange-600 uppercase tracking-widest mb-4">I. IVA Devengado (Tus Ingresos)</h3>
                      <div className="space-y-4">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                            <span className="text-sm font-bold text-slate-700 sm:w-1/3">Régimen general ordinario (21%)</span>
                            <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end gap-x-8 gap-y-2 w-full sm:w-2/3">
                               <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Base [01]</span>
                                  <span className="text-sm font-bold text-slate-900">{mod303.base21.toFixed(2)} €</span>
                               </div>
                               <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo [02]</span>
                                  <span className="text-sm font-bold text-slate-900">21%</span>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota [03]</span>
                                  <span className="text-sm font-black text-emerald-600">+{mod303.cuota21.toFixed(2)} €</span>
                               </div>
                            </div>
                         </div>

                         <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                            <span className="text-sm font-bold text-slate-700 sm:w-1/3">Régimen reducido (10%)</span>
                            <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end gap-x-8 gap-y-2 w-full sm:w-2/3">
                               <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Base [04]</span>
                                  <span className="text-sm font-bold text-slate-900">{mod303.base10.toFixed(2)} €</span>
                               </div>
                               <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo [05]</span>
                                  <span className="text-sm font-bold text-slate-900">10%</span>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota [06]</span>
                                  <span className="text-sm font-black text-emerald-600">+{mod303.cuota10.toFixed(2)} €</span>
                               </div>
                            </div>
                         </div>

                         <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                            <span className="text-sm font-bold text-slate-700 sm:w-1/3">Régimen superreducido (4%)</span>
                            <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end gap-x-8 gap-y-2 w-full sm:w-2/3">
                               <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Base [07]</span>
                                  <span className="text-sm font-bold text-slate-900">{mod303.base4.toFixed(2)} €</span>
                               </div>
                               <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo [08]</span>
                                  <span className="text-sm font-bold text-slate-900">4%</span>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota [09]</span>
                                  <span className="text-sm font-black text-emerald-600">+{mod303.cuota4.toFixed(2)} €</span>
                               </div>
                            </div>
                         </div>

                         <div className="flex justify-between items-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <span className="text-sm font-black text-orange-800 uppercase tracking-wide">Suma de Cuotas [27]:</span>
                            <span className="text-lg font-black text-orange-600">+{mod303.totalCuotaDevengada.toFixed(2)} €</span>
                         </div>
                      </div>
                   </section>

                   <section>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">II. IVA Deducible (Tus Gastos)</h3>
                      <div className="space-y-4">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                            <span className="text-sm font-bold text-slate-700 sm:w-1/2">Operaciones interiores corrientes</span>
                            <div className="flex justify-between sm:justify-end gap-8 w-full sm:w-1/2">
                               <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Base [28]</span>
                                  <span className="text-sm font-bold text-slate-900">{mod303.baseDeducible.toFixed(2)} €</span>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota Deducible [29]</span>
                                  <span className="text-sm font-black text-rose-500">-{mod303.cuotaDeducible.toFixed(2)} €</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </section>

                   <section className="pt-6 border-t border-slate-200">
                      <div className={`p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 border ${mod303.resultado > 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                         <span className="text-sm font-black text-slate-600 uppercase tracking-widest">Resultado Liquidación [71]</span>
                         <div className="text-left sm:text-right">
                            <span className={`text-4xl md:text-5xl font-black tracking-tight ${mod303.resultado > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                               {mod303.resultado > 0 ? 'A Pagar:' : 'A Favor:'} {Math.abs(mod303.resultado).toFixed(2)} €
                            </span>
                         </div>
                      </div>
                   </section>

                </div>
             </div>
          </div>
          <div className="h-10"></div>
        </main>
      </div>
    </Show>
  );
}