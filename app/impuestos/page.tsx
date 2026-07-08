"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Registramos la fuente profesional
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

// Estilos para el PDF del Gestor
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Roboto', backgroundColor: '#ffffff' },
  header: { borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 20, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 5 },
  section: { marginBottom: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, color: '#475569', fontWeight: 700 },
  value: { fontSize: 11, color: '#0f172a' },
  totalBox: { marginTop: 20, padding: 20, backgroundColor: '#eff6ff', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: 700, color: '#1e3a8a' },
  totalValue: { fontSize: 20, fontWeight: 700, color: '#2563eb' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 9, color: '#94a3b8', textAlign: 'center' }
});

// Plantilla del PDF de Resumen
const ResumenPDF = ({ empresaId, trimestre, totalDevengado, totalDeducible, resultado, fecha }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Auditoría Fiscal Trimestral</Text>
        <Text style={styles.subtitle}>Empresa: {empresaId} | Periodo: {trimestre} | Fecha: {fecha}</Text>
      </View>

      <View style={styles.section}>
        <Text style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 15 }}>Desglose de Operaciones</Text>
        <View style={styles.row}>
          <Text style={styles.label}>I. Total IVA Devengado (Ingresos):</Text>
          <Text style={styles.value}>+{totalDevengado.toFixed(2)} €</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>II. Total IVA Deducible (Gastos):</Text>
          <Text style={{...styles.value, color: '#e11d48'}}>-{totalDeducible.toFixed(2)} €</Text>
        </View>
      </View>

      <View style={{...styles.totalBox, backgroundColor: resultado > 0 ? '#fffbeb' : '#eff6ff'}}>
        <Text style={{...styles.totalLabel, color: resultado > 0 ? '#b45309' : '#1e3a8a'}}>
          RESULTADO LIQUIDACIÓN (A {resultado > 0 ? 'PAGAR' : 'FAVOR'}):
        </Text>
        <Text style={{...styles.totalValue, color: resultado > 0 ? '#d97706' : '#2563eb'}}>
          {Math.abs(resultado).toFixed(2)} €
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Documento generado automáticamente por el motor de inteligencia de TaxGuard AI.</Text>
      </View>
    </Page>
  </Document>
);

export default function Impuestos() {
  const [isMounted, setIsMounted] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [trimestre, setTrimestre] = useState("1T"); 
  const [data, setData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

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

  // 🚀 FUNCIÓN MÁGICA: GENERAR ZIP NIVEL PREMIUM
  const descargarCierreTrimestral = async () => {
    if (datosTrimestre.length === 0) return alert("No hay datos en este trimestre para exportar.");
    setIsExporting(true);
    
    try {
        const zip = new JSZip();
        
        // 1. Crear el CSV REPARADO (con firma UTF-8 BOM para Excel)
        let csvContent = "\uFEFFFecha;Categoria;Tipo;Base Imponible;IVA (%);Cuota IVA;Total Movimiento\n";
        datosTrimestre.forEach(item => {
            const tipo = item.total >= 0 ? "INGRESO" : "GASTO";
            const cuota = Math.abs(item.total) * (item.iva / 100);
            csvContent += `${item.name};${item.categoria || 'General'};${tipo};${Math.abs(item.total).toFixed(2)};${item.iva || 0}%;${cuota.toFixed(2)};${Math.abs(item.total + (item.total >= 0 ? cuota : -cuota)).toFixed(2)}\n`;
        });
        zip.file(`1_Libro_Mayor_${empresaId}_${trimestre}.csv`, csvContent);

        // 2. Crear resumen en PDF Oficial de forma invisible
        const pdfData = { 
            empresaId, 
            trimestre, 
            totalDevengado: totalCuotaDevengado, 
            totalDeducible: cuotaGastos, 
            resultado, 
            fecha: new Date().toLocaleDateString() 
        };
        const blobPDF = await pdf(<ResumenPDF {...pdfData} />).toBlob();
        zip.file(`2_Auditoria_Fiscal_${empresaId}_${trimestre}.pdf`, blobPDF);

        // 3. Generar y descargar el paquete final
        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, `Cierre_Fiscal_${empresaId}_${trimestre}.zip`);
    } catch (error) {
        console.error("Error generando el archivo:", error);
        alert("Ocurrió un error al empaquetar los archivos.");
    } finally {
        setIsExporting(false);
    }
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
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium shadow-sm" href="/impuestos">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Modelos Tributarios
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/facturas">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Facturación PDF
              </Link>
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
                disabled={isExporting}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isExporting ? "⏳ Empaquetando Documentos..." : "📥 Descargar Cierre Trimestral (ZIP)"}
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