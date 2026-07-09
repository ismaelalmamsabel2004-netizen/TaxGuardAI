"use client";

import { useState, useEffect } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Fuentes para el PDF de la gestoría
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

// Diseño Premium del PDF
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

// Estructura del PDF del Gestor
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Cálculos matemáticos
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
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
          
          {/* 🚀 CABECERA DE MÓVIL CORRECTA */}
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
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">T</div>
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium transition shadow-sm" href="/impuestos" onClick={() => setIsSidebarOpen(false)}>
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
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
                <UserButton/>
              </div>
            </div>
          </aside>

          {/* Sombra de fondo menú móvil */}
          {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

          <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative print:p-0">
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 border-b border-slate-200 pb-6 gap-4 print:border-b-2 print:border-slate-900">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Modelos Oficiales</h1>
                <p className="text-sm font-medium text-slate-500 mt-1 print:text-slate-800">Gestión fiscal inteligente lista para tu asesoría.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <button 
                  onClick={descargarCierreTrimestral}
                  disabled={isExporting}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isExporting ? "⏳ Empaquetando..." : "📥 Descargar Cierre (ZIP)"}
                </button>

                <div className="flex w-full sm:w-auto bg-white border border-slate-200 p-1 rounded-xl shadow-sm gap-1">
                  {["1T", "2T", "3T", "4T"].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setTrimestre(t)}
                      className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${trimestre === t ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl print:shadow-none print:border-none overflow-hidden max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white flex justify-between items-center print:bg-white print:text-black print:border-b">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Modelo 303</h2>
                  <p className="text-xs font-medium opacity-90 print:opacity-100">Borrador interno para {empresaId}</p>
                </div>
              </div>

              <div className="p-4 md:p-8 space-y-8 print:p-0 print:mt-4">
                <div>
                  <h3 className="text-xs font-black text-amber-600 print:text-slate-800 uppercase tracking-widest border-b border-amber-100 print:border-slate-300 pb-2 mb-4">I. IVA Devengado (Tus Ingresos)</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center bg-slate-50/50 print:bg-transparent p-4 rounded-xl border border-slate-100 print:border-b print:rounded-none">
                      <div className="md:col-span-4 text-xs font-bold text-slate-600">Régimen general ordinario (21%)</div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Base [01]: <span className="font-bold text-slate-700">{base21.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                      <div className="md:col-span-2 text-left md:text-center text-xs text-slate-500 font-bold">Tipo [02]: <span className="text-slate-700">21%</span></div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Cuota [03]: <span className="font-bold text-emerald-600 print:text-slate-700">+{cuota21.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                    </div>
                    
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center bg-slate-50/50 print:bg-transparent p-4 rounded-xl border border-slate-100 print:border-b print:rounded-none">
                      <div className="md:col-span-4 text-xs font-bold text-slate-600">Régimen reducido (10%)</div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Base [04]: <span className="font-bold text-slate-700">{base10.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                      <div className="md:col-span-2 text-left md:text-center text-xs text-slate-500 font-bold">Tipo [05]: <span className="text-slate-700">10%</span></div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Cuota [06]: <span className="font-bold text-emerald-600 print:text-slate-700">+{cuota10.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                    </div>

                    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center bg-slate-50/50 print:bg-transparent p-4 rounded-xl border border-slate-100 print:border-b print:rounded-none">
                      <div className="md:col-span-4 text-xs font-bold text-slate-600">Régimen superreducido (4%)</div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Base [07]: <span className="font-bold text-slate-700">{base4.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                      <div className="md:col-span-2 text-left md:text-center text-xs text-slate-500 font-bold">Tipo [08]: <span className="text-slate-700">4%</span></div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Cuota [09]: <span className="font-bold text-emerald-600 print:text-slate-700">+{cuota4.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-amber-50 print:bg-transparent rounded-xl border border-amber-100 mt-2">
                      <span className="text-xs font-black text-amber-800 print:text-slate-800 uppercase">Suma de cuotas [27]:</span>
                      <span className="text-sm font-black text-amber-700 print:text-slate-800">+{totalCuotaDevengado.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">II. IVA Deducible (Tus Gastos)</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center bg-slate-50/50 print:bg-transparent p-4 rounded-xl border border-slate-100 print:border-b print:rounded-none">
                      <div className="md:col-span-5 text-xs font-bold text-slate-600">Operaciones interiores corrientes</div>
                      <div className="md:col-span-4 text-left md:text-right text-xs text-slate-500 font-medium">Base Imponible [28]: <span className="font-bold text-slate-700">{baseGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                      <div className="md:col-span-3 text-left md:text-right text-xs text-slate-500 font-medium">Cuota Deducible [29]: <span className="font-bold text-rose-600 print:text-slate-700">-{cuotaGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</span></div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className={`p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:bg-transparent print:border-t-2 print:border-slate-800 print:rounded-none ${resultado > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Resultado de Liquidación [71]</p>
                     </div>
                     <div className="w-full md:w-auto text-left md:text-right">
                        <p className={`text-3xl font-black tracking-tight print:text-slate-900 ${resultado > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                           {resultado > 0 ? 'Pagar: ' : 'A favor: '} {Math.abs(resultado).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                        </p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-10"></div>
          </main>
        </div>
      </Show>

      {/* 🚀 EL ESCAPARATE: LA LANDING PAGE PREMIUM B2B */}
      <Show when="signed-out">
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30" translate="no">
          <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md fixed top-0 w-full z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">T</div>
                <span className="text-2xl font-black tracking-tight text-white">TaxGuard<span className="text-blue-500">AI</span></span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:block text-sm font-medium text-slate-400">¿Ya eres cliente?</span>
                <SignInButton mode="modal">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition backdrop-blur-sm border border-white/5">
                    Acceso a Clientes
                  </button>
                </SignInButton>
              </div>
            </div>
          </nav>
          <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                SaaS Financiero B2B
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8 max-w-4xl mx-auto">
                El primer Director Financiero con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Inteligencia Artificial</span>
              </h1>
              
              <p className="text-lg lg:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                Automatiza tu contabilidad, escanea facturas al instante y genera los modelos oficiales de Hacienda sin depender de terceros. El control total de tu rentabilidad, en tiempo real.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignInButton mode="modal">
                  <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl shadow-blue-500/20 border border-blue-400/20">
                    Iniciar Sesión
                  </button>
                </SignInButton>
                <button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl border border-slate-700 flex items-center justify-center gap-2">
                  Solicitar Implantación <span className="text-slate-400 text-sm font-normal">(1.200 €)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 bg-slate-950">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-white mb-4">Todo lo que tu empresa necesita para escalar</h2>
              <p className="text-slate-400">Sustituye horas de trabajo manual por precisión algorítmica.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-blue-500/30 transition">
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Escáner OCR Inteligente</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Sube la foto de un ticket o factura y la Inteligencia Artificial extraerá automáticamente el concepto, base imponible y tipo de IVA.</p>
              </div>
              
              <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gestoría Automatizada</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Genera tus modelos de IVA trimestral (Mod 303) al instante, y emite facturas en PDF profesionales para tus clientes con un solo clic.</p>
              </div>
              
              <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-purple-500/30 transition">
                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">CFO Virtual 24/7</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Chatea directamente con tu panel financiero. Pídele auditorías de gastos, previsiones de tesorería y alertas de desvíos en tiempo real.</p>
              </div>
            </div>
          </div>

          <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm relative z-10 bg-slate-950">
            <p>© {new Date().getFullYear()} TaxGuard AI. Todos los derechos reservados.</p>
            <p className="mt-2">Plataforma SaaS de alto rendimiento para PYMEs.</p>
          </footer>
        </div>
      </Show>
    </>
  );
}