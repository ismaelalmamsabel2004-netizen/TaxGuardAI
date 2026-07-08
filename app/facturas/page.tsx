"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

// Registramos fuentes profesionales para un acabado Premium
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

// 🚀 NUEVOS ESTILOS PREMIUM PARA EL PDF
const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 50, fontFamily: 'Roboto' },
  
  // Cabecera
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 30, borderBottomWidth: 2, borderBottomColor: '#2563eb', marginBottom: 40 },
  logoSection: { flexDirection: 'column', maxWidth: '60%' },
  logoText: { fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5, marginBottom: 4 },
  logoSub: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  
  invoiceInfoBox: { alignItems: 'flex-end' },
  invoiceBadge: { backgroundColor: '#eff6ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, marginBottom: 8 },
  invoiceBadgeText: { color: '#2563eb', fontSize: 14, fontWeight: 700, letterSpacing: 1 },
  invoiceDetailsText: { fontSize: 10, color: '#475569', marginBottom: 4 },
  invoiceDetailsBold: { fontWeight: 700, color: '#0f172a' },

  // Sección de información (Emisor / Cliente)
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  infoColumn: { width: '45%', flexDirection: 'column' },
  infoLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 },
  infoName: { fontSize: 12, color: '#0f172a', fontWeight: 700, marginBottom: 4 },
  infoText: { fontSize: 10, color: '#475569', marginBottom: 3, lineHeight: 1.4 },

  // Tabla de conceptos
  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderCell: { paddingVertical: 10, paddingHorizontal: 8, fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { paddingVertical: 12, paddingHorizontal: 8, fontSize: 10, color: '#334155', lineHeight: 1.4 },
  
  // Anchos de columna
  colConcepto: { width: '45%' },
  colBase: { width: '20%', textAlign: 'right' },
  colIva: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  // Bloque de totales
  totalsWrapper: { flexDirection: 'row', justifyContent: 'flex-end' },
  totalsBox: { width: '50%', backgroundColor: '#f8fafc', borderRadius: 8, padding: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValue: { fontSize: 11, color: '#0f172a', fontWeight: 500 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  grandTotalLabel: { fontSize: 12, color: '#0f172a', fontWeight: 700, textTransform: 'uppercase' },
  grandTotalValue: { fontSize: 16, color: '#2563eb', fontWeight: 700 },

  // Footer
  footer: { position: 'absolute', bottom: 40, left: 50, right: 50, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94a3b8' },
  footerBrand: { fontSize: 8, color: '#3b82f6', fontWeight: 700 }
});

// 🚀 PLANTILLA PDF ACTUALIZADA
const FacturaPDF = ({ datos }: { datos: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Cabecera Premium */}
      <View style={styles.headerContainer}>
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>{datos.miEmpresa.toUpperCase()}</Text>
          <Text style={styles.logoSub}>Facturación Electrónica</Text>
        </View>
        <View style={styles.invoiceInfoBox}>
          <View style={styles.invoiceBadge}>
             <Text style={styles.invoiceBadgeText}>FACTURA</Text>
          </View>
          <Text style={styles.invoiceDetailsText}>Nº Documento: <Text style={styles.invoiceDetailsBold}>{datos.numeroFactura}</Text></Text>
          <Text style={styles.invoiceDetailsText}>Fecha Emisión: <Text style={styles.invoiceDetailsBold}>{datos.fecha}</Text></Text>
        </View>
      </View>

      {/* Grid de Datos Fiscales */}
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

      {/* Tabla de Conceptos Profesionales */}
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

      {/* Resumen Financiero Destacado */}
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

      {/* Footer Tecnológico */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Documento fiscal válido. Este documento acredita la prestación de servicios detallada.</Text>
        <Text style={styles.footerBrand}>Generado de forma segura mediante TaxGuard AI</Text>
      </View>
    </Page>
  </Document>
);

export default function GeneradorFacturas() {
  const [isMounted, setIsMounted] = useState(false);
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
    const lista = guardadas ? JSON.parse(guardadas) : ["Alperez"];
    setEmpresas(lista);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || lista[0] || "");
  }, []);

  if (!isMounted) return null;

  const baseNum = Number(baseImponible) || 0;
  const ivaNum = Number(ivaSeleccionado) || 0;
  const cuotaIva = baseNum * (ivaNum / 100);
  const totalFila = baseNum + cuotaIva;
  const totalFinal = totalFila;

  const datosPDF = {
    miEmpresa: empresaId, numeroFactura, fecha: fecha.split('-').reverse().join('/'),
    miNif, miDireccion, clienteNombre, clienteNif, clienteDireccion,
    concepto, baseImponible: baseNum.toFixed(2), ivaSeleccionado, cuotaIva, totalFila, totalFinal
  };

  const guardarEnLibroMayor = async () => {
    if (!baseImponible || !concepto) return alert("Rellena el concepto y la base imponible primero.");
    setIsSaving(true);
    
    try {
      const [y, m, d] = fecha.split('-');
      const fechaFormateada = `${d}/${m}/${y}`;
     
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          month: fechaFormateada, 
          total: baseNum, 
          empresaId: empresaId, 
          categoria: "Ventas", 
          isRecurrent: false, 
          iva: ivaSeleccionado 
        }) 
      });

      if (res.ok) {
        setFacturaGuardada(true);
        const numActual = parseInt(numeroFactura.split('-')[2]);
        setNumeroFactura(`F-${new Date().getFullYear()}-${String(numActual + 1).padStart(3, '0')}`);
        setClienteNombre(""); setClienteNif(""); setClienteDireccion(""); setConcepto(""); setBaseImponible("");
        setTimeout(() => setFacturaGuardada(false), 4000);
      } else {
        alert("Error al guardar en el Libro Mayor.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
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
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/impuestos">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Modelos Tributarios
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium shadow-sm" href="/facturas">
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
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Creador de Facturas Oficiales</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Genera PDFs profesionales y regístralos automáticamente en tu Libro Mayor.</p>
            </div>
            
            <div className="flex gap-3">
               <button 
                  onClick={guardarEnLibroMayor} 
                  disabled={isSaving || baseNum <= 0}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-md disabled:opacity-50"
               >
                  {isSaving ? "Guardando..." : "1. Guardar Ingreso en Libro Mayor"}
               </button>
               
               {baseNum > 0 && (
                 <PDFDownloadLink document={<FacturaPDF datos={datosPDF} />} fileName={`${numeroFactura}_${empresaId.replace(/\s+/g, '')}.pdf`}>
                   {/* @ts-ignore */}
                   {({ loading }) => (
                     <button disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50">
                       {loading ? "Generando documento..." : "2. Descargar PDF Original"}
                     </button>
                   )}
                 </PDFDownloadLink>
               )}
            </div>
          </header>

          {facturaGuardada && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-fade-in-up">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full font-black text-lg">✓</span>
              <div>
                <h4 className="text-sm font-bold text-emerald-800">Factura registrada con éxito</h4>
                <p className="text-xs text-emerald-600 font-medium">El ingreso y el IVA ya están sumados en tu Consola General y en los Modelos Tributarios.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              
              <div className="p-8 border-r border-slate-100">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Datos del Documento</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nº Factura</label>
                      <input type="text" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha de Emisión</label>
                      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Tus Datos Fiscales ({empresaId})</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <input type="text" placeholder="Tu NIF/CIF..." value={miNif} onChange={e => setMiNif(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white" />
                      <input type="text" placeholder="Tu Dirección Legal..." value={miDireccion} onChange={e => setMiDireccion(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Datos del Cliente receptor</h4>
                    <div className="space-y-3">
                      <input type="text" placeholder="Nombre de la empresa o cliente..." value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                      <div className="grid grid-cols-2 gap-4">
                         <input type="text" placeholder="NIF/CIF del cliente..." value={clienteNif} onChange={e => setClienteNif(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                         <input type="text" placeholder="Dirección del cliente..." value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Conceptos y Cantidades</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descripción del Servicio / Producto</label>
                      <input type="text" placeholder="Ej: Alquiler de equipo de sonido profesional..." value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Imponible (€)</label>
                        <input type="number" step="any" placeholder="0.00" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Impuesto Aplicado</label>
                        <select value={ivaSeleccionado} onChange={(e) => setIvaSeleccionado(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm">
                            <option value="21">IVA General (21%)</option>
                            <option value="10">IVA Reducido (10%)</option>
                            <option value="4">IVA Superreducido (4%)</option>
                            <option value="0">Exento de IVA (0%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
                   <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-slate-500 font-medium">Subtotal (Base Imponible)</span>
                         <span className="font-bold text-slate-700">{baseNum.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-slate-500 font-medium">Impuestos (IVA {ivaSeleccionado}%)</span>
                         <span className="font-bold text-emerald-600">+{cuotaIva.toFixed(2)} €</span>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total a Cobrar</span>
                      <span className="text-3xl font-black text-blue-600 tracking-tight">{totalFinal.toFixed(2)} €</span>
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