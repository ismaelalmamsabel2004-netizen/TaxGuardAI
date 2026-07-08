"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 50, fontFamily: 'Roboto' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 30, borderBottomWidth: 2, borderBottomColor: '#2563eb', marginBottom: 40 },
  logoSection: { flexDirection: 'column', maxWidth: '60%' },
  logoText: { fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5, marginBottom: 4 },
  logoSub: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  invoiceInfoBox: { alignItems: 'flex-end' },
  invoiceBadge: { backgroundColor: '#eff6ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, marginBottom: 8 },
  invoiceBadgeText: { color: '#2563eb', fontSize: 14, fontWeight: 700, letterSpacing: 1 },
  invoiceDetailsText: { fontSize: 10, color: '#475569', marginBottom: 4 },
  invoiceDetailsBold: { fontWeight: 700, color: '#0f172a' },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  infoColumn: { width: '45%', flexDirection: 'column' },
  infoLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 },
  infoName: { fontSize: 12, color: '#0f172a', fontWeight: 700, marginBottom: 4 },
  infoText: { fontSize: 10, color: '#475569', marginBottom: 3, lineHeight: 1.4 },
  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderCell: { paddingVertical: 10, paddingHorizontal: 8, fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { paddingVertical: 12, paddingHorizontal: 8, fontSize: 10, color: '#334155', lineHeight: 1.4 },
  colConcepto: { width: '45%' },
  colBase: { width: '20%', textAlign: 'right' },
  colIva: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalsWrapper: { flexDirection: 'row', justifyContent: 'flex-end' },
  totalsBox: { width: '60%', backgroundColor: '#f8fafc', borderRadius: 8, padding: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValue: { fontSize: 11, color: '#0f172a', fontWeight: 500 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  grandTotalLabel: { fontSize: 12, color: '#0f172a', fontWeight: 700, textTransform: 'uppercase' },
  grandTotalValue: { fontSize: 16, color: '#2563eb', fontWeight: 700 },
  footer: { position: 'absolute', bottom: 40, left: 50, right: 50, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94a3b8' },
  footerBrand: { fontSize: 8, color: '#3b82f6', fontWeight: 700 }
});

const FacturaPDF = ({ datos }: { datos: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.headerContainer}>
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>{datos.miEmpresa.toUpperCase()}</Text>
          <Text style={styles.logoSub}>Facturación Electrónica</Text>
        </View>
        <View style={styles.invoiceInfoBox}>
          <View style={styles.invoiceBadge}><Text style={styles.invoiceBadgeText}>FACTURA</Text></View>
          <Text style={styles.invoiceDetailsText}>Nº Documento: <Text style={styles.invoiceDetailsBold}>{datos.numeroFactura}</Text></Text>
          <Text style={styles.invoiceDetailsText}>Fecha Emisión: <Text style={styles.invoiceDetailsBold}>{datos.fecha}</Text></Text>
        </View>
      </View>
      <View style={styles.infoGrid}>
        <View style={styles.infoColumn}>
          <Text style={styles.infoLabel}>Información del Emisor</Text>
          <Text style={styles.infoName}>{datos.miEmpresa}</Text>
          <Text style={styles.infoText}>NIF/CIF: {datos.miNif}</Text>
          <Text style={styles.infoText}>{datos.miDireccion}</Text>
        </View>
        <View style={styles.infoColumn}>
          <Text style={styles.infoLabel}>Facturado A</Text>
          <Text style={styles.infoName}>{datos.clienteNombre}</Text>
          <Text style={styles.infoText}>NIF/CIF: {datos.clienteNif}</Text>
          <Text style={styles.infoText}>{datos.clienteDireccion}</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colConcepto]}>Descripción del Concepto</Text>
          <Text style={[styles.tableHeaderCell, styles.colBase]}>Base Imp.</Text>
          <Text style={[styles.tableHeaderCell, styles.colIva]}>IVA %</Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>Importe Total</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.colConcepto]}>{datos.concepto}</Text>
          <Text style={[styles.tableCell, styles.colBase]}>{datos.baseImponible} €</Text>
          <Text style={[styles.tableCell, styles.colIva]}>{datos.ivaSeleccionado}%</Text>
          <Text style={[styles.tableCell, styles.colTotal]}>{datos.totalFila.toFixed(2)} €</Text>
        </View>
      </View>
      <View style={styles.totalsWrapper}>
         <View style={styles.totalsBox}>
           <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Subtotal Operación:</Text>
             <Text style={styles.totalValue}>{datos.baseImponible} €</Text>
           </View>
           <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Impuestos Aplicados (IVA {datos.ivaSeleccionado}%):</Text>
             <Text style={styles.totalValue}>{datos.cuotaIva.toFixed(2)} €</Text>
           </View>
           <View style={styles.grandTotalRow}>
             <Text style={styles.grandTotalLabel}>Total a Pagar</Text>
             <Text style={styles.grandTotalValue}>{datos.totalFinal.toFixed(2)} €</Text>
           </View>
         </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Documento fiscal válido. Acredita la prestación de servicios.</Text>
        <Text style={styles.footerBrand}>Generado de forma segura mediante TaxGuard AI</Text>
      </View>
    </Page>
  </Document>
);

export default function GeneradorFacturas() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  
  const [numeroFactura, setNumeroFactura] = useState(`F-${new Date().getFullYear()}-001`);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [miNif, setMiNif] = useState("");
  const [miDireccion, setMiDireccion] = useState("");
  
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  
  const [concepto, setConcepto] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");

  const [isSaving, setIsSaving] = useState(false);
  const [facturaGuardada, setFacturaGuardada] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const guardadas = localStorage.getItem('taxguard_empresas');
    setEmpresas(guardadas ? JSON.parse(guardadas) : ["Alperez"]);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || "Alperez");
  }, []);

  if (!isMounted) return null;

  const baseNum = Number(baseImponible.replace(/,/g, '.').replace(/[^0-9.-]/g, '')) || 0;
  const ivaNum = Number(ivaSeleccionado) || 0;
  const cuotaIva = baseNum * (ivaNum / 100);
  const totalFila = baseNum + cuotaIva;
  const totalFinal = totalFila;

  const datosPDF = {
    miEmpresa: empresaId, numeroFactura, fecha: fecha.split('-').reverse().join('/'),
    miNif, miDireccion, clienteNombre, clienteNif, clienteDireccion,
    concepto, baseImponible: baseNum.toFixed(2), ivaSeleccionado, cuotaIva, totalFila, totalFinal
  };

  // 🚀 LÓGICA DE GUARDADO BLINDADA
  const guardarEnLibroMayor = async () => {
    if (!empresaId) return alert("⚠️ Selecciona un Espacio de Trabajo.");
    if (!concepto) return alert("⚠️ Rellena el concepto.");
    if (baseNum <= 0) return alert("⚠️ Rellena una Base Imponible válida.");
    
    setIsSaving(true);
    try {
      const [y, m, d] = fecha.split('-');
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ month: `${d}/${m}/${y}`, total: baseNum, empresaId: empresaId, categoria: "Ventas", isRecurrent: false, iva: ivaSeleccionado }) 
      });

      if (res.ok) {
        setFacturaGuardada(true);
        const numActual = parseInt(numeroFactura.split('-')[2]);
        setNumeroFactura(`F-${new Date().getFullYear()}-${String(numActual + 1).padStart(3, '0')}`);
        setClienteNombre(""); setClienteNif(""); setClienteDireccion(""); setConcepto(""); setBaseImponible("");
        setTimeout(() => setFacturaGuardada(false), 4000);
      } else {
        alert("⚠️ Error al guardar en el Libro Mayor.");
      }
    } catch (error) {
      alert("⚠️ Error de red.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
        
        <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div><span className="font-bold text-white">TaxGuard<span className="text-blue-500">AI</span></span></div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        </div>

        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out`}>
          <div>
             <div className="flex items-center justify-between mb-10 px-2 mt-4 lg:mt-0">
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div><h2 className="text-xl font-black text-white">TaxGuard</h2></div>
                <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="mb-6 px-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
              <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full mt-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none">{empresas.map(e => <option key={e} value={e}>{e}</option>)}</select>
             </div>
             <nav className="space-y-1">
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/">Consola General</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis">Análisis Avanzado</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/impuestos">Modelos Tributarios</Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium shadow-sm" href="/facturas">Facturación PDF</Link>
            </nav>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800"><span className="text-xs font-semibold text-slate-400">Entorno Seguro</span><UserButton/></div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
          <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-200 pb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">Creador de Facturas Oficiales</h1>
            </div>
            <div className="flex flex-wrap gap-3">
               <button onClick={guardarEnLibroMayor} disabled={isSaving || baseNum <= 0} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md disabled:opacity-50">{isSaving ? "Guardando..." : "1. Guardar Ingreso"}</button>
               {baseNum > 0 && (
                 <PDFDownloadLink document={<FacturaPDF datos={datosPDF} />} fileName={`${numeroFactura}_${empresaId}.pdf`}>
                   {/* @ts-ignore */}
                   {({ loading }) => (<button disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md disabled:opacity-50">{loading ? "Generando..." : "2. Descargar PDF"}</button>)}
                 </PDFDownloadLink>
               )}
            </div>
          </header>

          {facturaGuardada && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3"><span className="text-emerald-600 font-black">✓</span><div><h4 className="text-sm font-bold text-emerald-800">Guardado</h4></div></div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-4 md:p-8 border-b lg:border-b-0 lg:border-r border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase mb-6">Datos del Documento</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nº Factura</label><input type="text" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" /></div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Tus Datos Fiscales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <input type="text" placeholder="Tu NIF/CIF..." value={miNif} onChange={e => setMiNif(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" />
                      <input type="text" placeholder="Tu Dirección Legal..." value={miDireccion} onChange={e => setMiDireccion(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Datos del Cliente</h4>
                    <div className="space-y-3">
                      <input type="text" placeholder="Nombre cliente..." value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="text" placeholder="NIF/CIF..." value={clienteNif} onChange={e => setClienteNif(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl" />
                         <input type="text" placeholder="Dirección..." value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-8 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase mb-6">Conceptos</h3>
                  <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descripción</label><input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full p-3 bg-white border rounded-xl" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Imponible</label>
                        {/* 🚀 CORRECCIÓN: Input sin bloqueos ciegos para móvil */}
                        <input type="text" inputMode="decimal" placeholder="Ej: 500" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">IVA</label>
                        <select value={ivaSeleccionado} onChange={(e) => setIvaSeleccionado(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold"><option value="21">21%</option><option value="10">10%</option><option value="4">4%</option><option value="0">0%</option></select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white p-6 rounded-2xl border shadow-md">
                   <div className="space-y-3 mb-4">
                      <div className="flex justify-between"><span className="text-slate-500">Base Imponible</span><span className="font-bold">{baseNum.toFixed(2)} €</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">IVA {ivaSeleccionado}%</span><span className="font-bold text-emerald-600">+{cuotaIva.toFixed(2)} €</span></div>
                   </div>
                   <div className="pt-4 border-t flex justify-between items-center"><span className="text-xs font-black uppercase">Total a Cobrar</span><span className="text-3xl font-black text-blue-600">{totalFinal.toFixed(2)} €</span></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Show>
  );
}