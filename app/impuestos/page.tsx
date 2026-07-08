"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Impuestos() {
  const [isMounted, setIsMounted] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [trimestre, setTrimestre] = useState("1T"); 
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const guardadas = localStorage.getItem('taxguard_empresas');
    const lista = guardadas ? JSON.parse(guardadas) : ["Alperez"];
    setEmpresas(lista);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || lista[0] || "");
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`)
      .then(res => res.ok ? res.json() : [])
      .then(d => setData(d || []));
  }, [empresaId]);

  if (!isMounted) return null;

  const filtrarPorTrimestre = (movimientos: any[]) => {
    return movimientos.filter(item => {
      if (!item.name) return false;
      const partes = item.name.split('/');
      const mes = parseInt(partes[1], 10);
      if (trimestre === "1T") return mes >= 1 && mes <= 3;
      if (trimestre === "2T") return mes >= 4 && mes <= 6;
      if (trimestre === "3T") return mes >= 7 && mes <= 9;
      if (trimestre === "4T") return mes >= 10 && mes <= 12;
      return false;
    });
  };

  const datosTrimestre = filtrarPorTrimestre(data);

  // Cálculos para el borrador
  let base21 = 0, cuota21 = 0, base10 = 0, cuota10 = 0, base4 = 0, cuota4 = 0;
  datosTrimestre.filter(d => d.total > 0).forEach(item => {
    const total = item.total;
    const iva = item.iva || 0;
    if (iva === 21) { base21 += total; cuota21 += total * 0.21; }
    else if (iva === 10) { base10 += total; cuota10 += total * 0.10; }
    else if (iva === 4) { base4 += total; cuota4 += total * 0.04; }
  });

  const totalCuotaDevengado = cuota21 + cuota10 + cuota4;
  let baseGastos = 0, cuotaGastos = 0;
  datosTrimestre.filter(d => d.total < 0).forEach(item => {
    const total = Math.abs(item.total);
    const iva = item.iva || 0;
    baseGastos += total;
    cuotaGastos += total * (iva / 100);
  });
  const resultado = totalCuotaDevengado - cuotaGastos;

  // 🚀 FUNCIÓN MÁGICA: GENERAR ZIP PARA GESTORÍA
  const descargarCierreTrimestral = async () => {
    const zip = new JSZip();
    
    // 1. Crear el CSV para el gestor
    let csvContent = "Fecha;Categoria;Base Imponible;IVA;Cuota IVA;Total\n";
    datosTrimestre.forEach(item => {
        const cuota = Math.abs(item.total) * (item.iva / 100);
        csvContent += `${item.name};${item.categoria};${Math.abs(item.total)};${item.iva}%;${cuota.toFixed(2)};${item.total}\n`;
    });
    zip.file("Libro_Mayor_" + trimestre + ".csv", csvContent);

    // 2. Crear resumen para el gestor
    const resumen = `RESUMEN TRIMESTRAL - ${empresaId}
    ---------------------------------
    Trimestre: ${trimestre}
    Total IVA Devengado: ${totalCuotaDevengado.toFixed(2)} €
    Total IVA Deducible: ${cuotaGastos.toFixed(2)} €
    Resultado Liquidación: ${resultado.toFixed(2)} €
    
    Este documento ha sido generado por TaxGuard AI.`;
    zip.file("Resumen_Auditoria.txt", resumen);

    // Generar y descargar
    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, `Cierre_Fiscal_${empresaId}_${trimestre}.zip`);
  };

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans text-slate-800" translate="no">
        
        <aside className="w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">T</div>
              <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
            </div>
            <div className="mb-6 px-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
              <select 
                value={empresaId} 
                onChange={(e) => {
                  setEmpresaId(e.target.value);
                  localStorage.setItem('taxguard_empresaActiva', e.target.value);
                }} 
                className="w-full mt-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none"
              >
                {empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <nav className="space-y-1">
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/">Consola General</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis">Análisis Avanzado</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium shadow-sm" href="/impuestos">Modelos Tributarios</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/facturas">Facturación PDF</Link>
            </nav>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
            <UserButton/>
          </div>
        </aside>

        <main className="flex-1 p-10 overflow-y-auto">
          <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modelos Impositivos Oficiales</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Gestión fiscal inteligente lista para tu asesoría.</p>
            </div>
            
            <div className="flex gap-3">
              {/* BOTÓN MÁGICO PARA EL GESTOR */}
              <button 
                onClick={descargarCierreTrimestral}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20"
              >
                📥 Descargar Cierre Trimestral (ZIP)
              </button>

              <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm gap-1">
                {["1T", "2T", "3T", "4T"].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setTrimestre(t)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${trimestre === t ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black tracking-tight">Modelo 303</h2>
                <p className="text-xs font-medium opacity-90">Borrador interno para {empresaId}</p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div>
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest border-b border-amber-100 pb-2 mb-4">I. IVA Devengado (Tus Ingresos)</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="col-span-4 text-xs font-bold text-slate-600">Régimen general ordinario (21%)</div>
                    <div className="col-span-3 text-right text-xs text-slate-400 font-medium">Base [01]: {base21.toLocaleString('es-ES', {minimumFractionDigits:2})} €</div>
                    <div className="col-span-2 text-center text-xs text-slate-400 font-bold">Tipo [02]: 21%</div>
                    <div className="col-span-3 text-right text-xs text-slate-400 font-medium">Cuota [03]: +{cuota21.toLocaleString('es-ES', {minimumFractionDigits:2})} €</div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100 mt-2">
                    <span className="text-xs font-black text-amber-800 uppercase">Suma de cuotas devengadas [27]:</span>
                    <span className="text-sm font-black text-amber-700">+{totalCuotaDevengado.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">II. IVA Deducible (Tus Gastos)</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="col-span-5 text-xs font-bold text-slate-600">Operaciones interiores corrientes</div>
                    <div className="col-span-4 text-right text-xs text-slate-400 font-medium">Base Imponible [28]: {baseGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</div>
                    <div className="col-span-3 text-right text-xs text-slate-400 font-medium">Cuota Deducible [29]: -{cuotaGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className={`p-5 rounded-2xl flex justify-between items-center ${resultado > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                   <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Resultado de Liquidación [71]</p>
                   </div>
                   <div className="text-right">
                      <p className={`text-3xl font-black tracking-tight ${resultado > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                         {resultado > 0 ? 'Pagar: ' : 'A favor: '} {Math.abs(resultado).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                      </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Show>
  );
}