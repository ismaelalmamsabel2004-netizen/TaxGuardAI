"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

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
          RESULTADO LIQUIDACIÓN:
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [trimestre, setTrimestre] = useState("1T"); 
  const [data, setData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const guardadas = localStorage.getItem('taxguard_empresas');
    setEmpresas(guardadas ? JSON.parse(guardadas) : ["Alperez"]);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || "Alperez");
  }, []);

  useEffect(() => {
    if (empresaId) fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`).then(r => r.ok ? r.json() : []).then(d => setData(d || []));
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

  const descargarCierreTrimestral = async () => {
    if (datosTrimestre.length === 0) return alert("No hay datos en este trimestre para exportar.");
    setIsExporting(true);
    try {
        const zip = new JSZip();
        let csvContent = "\uFEFFFecha;Categoria;Tipo;Base Imponible;IVA (%);Cuota IVA;Total Movimiento\n";
        datosTrimestre.forEach(item => {
            const tipo = item.total >= 0 ? "INGRESO" : "GASTO";
            const cuota = Math.abs(item.total) * (item.iva / 100);
            csvContent += `${item.name};${item.categoria || 'General'};${tipo};${Math.abs(item.total).toFixed(2)};${item.iva || 0}%;${cuota.toFixed(2)};${Math.abs(item.total + (item.total >= 0 ? cuota : -cuota)).toFixed(2)}\n`;
        });
        zip.file(`1_Libro_Mayor_${empresaId}_${trimestre}.csv`, csvContent);

        const pdfData = { empresaId, trimestre, totalDevengado: totalCuotaDevengado, totalDeducible: cuotaGastos, resultado, fecha: new Date().toLocaleDateString() };
        const blobPDF = await pdf(<ResumenPDF {...pdfData} />).toBlob();
        zip.file(`2_Auditoria_Fiscal_${empresaId}_${trimestre}.pdf`, blobPDF);

        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, `Cierre_Fiscal_${empresaId}_${trimestre}.zip`);
    } catch (error) {
        alert("Ocurrió un error al empaquetar los archivos.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
        
        <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div>
             <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out`}>
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

        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
          <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 border-b border-slate-200 pb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">Modelos Oficiales</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={descargarCierreTrimestral} disabled={isExporting} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50">
                {isExporting ? "⏳ Empaquetando..." : "📥 Descargar Cierre (ZIP)"}
              </button>
              <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm gap-1">
                {["1T", "2T", "3T", "4T"].map(t => (<button key={t} onClick={() => setTrimestre(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${trimestre === t ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{t}</button>))}
              </div>
            </div>
          </header>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white flex justify-between items-center">
              <div><h2 className="text-xl font-black tracking-tight">Modelo 303</h2><p className="text-xs font-medium opacity-90">Borrador interno</p></div>
            </div>

            <div className="p-4 md:p-8 space-y-8">
              <div>
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest border-b border-amber-100 pb-2 mb-4">I. IVA Devengado</h3>
                <div className="space-y-3">
                  <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="md:col-span-4 text-xs font-bold text-slate-600">Régimen general (21%)</div>
                    <div className="md:col-span-3 text-xs text-slate-400 font-medium">Base: <span className="font-bold text-slate-700">{base21.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                    <div className="md:col-span-5 text-xs text-slate-400 font-medium md:text-right">Cuota: <span className="font-bold text-emerald-600">+{cuota21.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-xs font-black text-amber-800 uppercase">Total devengado:</span>
                    <span className="text-sm font-black text-amber-700">+{totalCuotaDevengado.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">II. IVA Deducible</h3>
                <div className="space-y-3">
                  <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="md:col-span-5 text-xs font-bold text-slate-600">Operaciones corrientes</div>
                    <div className="md:col-span-4 text-xs text-slate-400 font-medium">Base: <span className="font-bold text-slate-700">{baseGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                    <div className="md:col-span-3 text-xs text-slate-400 font-medium md:text-right">Cuota: <span className="font-bold text-rose-600">-{cuotaGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className={`p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${resultado > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                   <div><p className="text-xs font-bold uppercase text-slate-500 mb-1">Resultado de Liquidación</p></div>
                   <div className="w-full md:w-auto text-left md:text-right">
                      <p className={`text-2xl md:text-3xl font-black ${resultado > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
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