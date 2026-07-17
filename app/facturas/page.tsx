"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton, Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, Image } from '@react-pdf/renderer';

// 🚀 CEREBRO CENTRAL
import { obtenerDatosSupabase, guardarDatoSupabase } from '../actions';

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
  logoImage: { width: 140, height: 60, objectFit: 'contain', marginBottom: 8 },
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
  bottomSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  paymentWrapper: { width: '40%' },
  paymentBox: { padding: 15, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  paymentTitle: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 },
  paymentText: { fontSize: 10, color: '#0f172a', fontWeight: 500, marginBottom: 4 },
  totalsWrapper: { width: '55%' },
  totalsBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 20 },
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
          {datos.logo ? (
             <Image src={datos.logo} style={styles.logoImage} />
          ) : (
             <Text style={styles.logoText}>{datos.miEmpresa.toUpperCase()}</Text>
          )}
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

      <View style={styles.bottomSection}>
         <View style={styles.paymentWrapper}>
            <View style={styles.paymentBox}>
               <Text style={styles.paymentTitle}>Método de Pago</Text>
               <Text style={styles.paymentText}>{datos.metodoPago}</Text>
               {datos.metodoPago === 'Transferencia' && datos.iban && (
                  <Text style={styles.paymentText}>IBAN: {datos.iban}</Text>
               )}
            </View>
         </View>
         <View style={styles.totalsWrapper}>
           <View style={styles.totalsBox}>
             <View style={styles.totalRow}>
               <Text style={styles.totalLabel}>Subtotal Operación:</Text>
               <Text style={styles.totalValue}>{datos.baseImponible} €</Text>
             </View>
             <View style={styles.totalRow}>
               <Text style={styles.totalLabel}>Impuestos (IVA {datos.ivaSeleccionado}%):</Text>
               <Text style={styles.totalValue}>{datos.cuotaIva.toFixed(2)} €</Text>
             </View>
             <View style={styles.grandTotalRow}>
               <Text style={styles.grandTotalLabel}>Total a Pagar</Text>
               <Text style={styles.grandTotalValue}>{datos.totalFinal.toFixed(2)} €</Text>
             </View>
           </View>
         </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Documento fiscal válido. Este documento acredita la prestación de servicios detallada.</Text>
        <Text style={styles.footerBrand}>Generado de forma segura mediante TaxGuard AI</Text>
      </View>
    </Page>
  </Document>
);

export default function GeneradorFacturas() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [allSettings, setAllSettings] = useState<any>({});
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  
  const [numeroFactura, setNumeroFactura] = useState(`F-${new Date().getFullYear()}-001`);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  
  const [miNif, setMiNif] = useState("");
  const [miDireccion, setMiDireccion] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [iban, setIban] = useState("");
  
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  
  const [concepto, setConcepto] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");

  const [isSaving, setIsSaving] = useState(false);
  const [facturaGuardada, setFacturaGuardada] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [facturaBloqueada, setFacturaBloqueada] = useState(false);
  
  const [historialFacturas, setHistorialFacturas] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [planActivo, setPlanActivo] = useState('loading');

  useEffect(() => {
    setIsMounted(true);
    
    if (!isLoaded) return;
    if (!isSignedIn) return;

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((data: any) => {
         const planDetectado = data.planSuscripcion || 'free';
         
         if (planDetectado === 'free') {
            router.push('/precios');
            return; 
         }

         setPlanActivo(planDetectado);
         setAllSettings(data);
         // 🚀 AQUÍ HEMOS ARREGLADO EL NOMBRE PARA QUE SEA IGUAL EN TODAS PARTES
         const listaEmpresas = data.empresas || ["Alperez", "PetClean", "Techmovile"];
         setEmpresas(listaEmpresas);
         const activa = data.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);
      });
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
      if (empresaId && allSettings.datosFacturacion && allSettings.datosFacturacion[empresaId]) {
          const config = allSettings.datosFacturacion[empresaId];
          setMiNif(config.nif || "");
          setMiDireccion(config.direccion || "");
          setLogo(config.logo || null);
          setMetodoPago(config.metodoPago || "Transferencia");
          setIban(config.iban || "");
      } else {
          setMiNif(""); setMiDireccion(""); setLogo(null); setMetodoPago("Transferencia"); setIban("");
      }
  }, [empresaId, allSettings]);

  useEffect(() => {
    if (!empresaId) return;
    // 🚀 LECTURA DIRECTA DEL CEREBRO CON LA EMPRESA FILTRADA
    obtenerDatosSupabase(empresaId).then(movimientos => {
         const anioFactura = fecha.split('-')[0] || new Date().getFullYear().toString();
         const ventas = movimientos.filter((m: any) => m.categoria === "Ventas" && Number(m.total) > 0);
         setHistorialFacturas(ventas); 

         if (!facturaBloqueada) {
            const ventasDelAnio = ventas.filter((m: any) => {
               const [, , y] = m.name.split('/');
               return y === anioFactura;
            });
            const siguienteNumero = ventasDelAnio.length + 1;
            setNumeroFactura(`F-${anioFactura}-${String(siguienteNumero).padStart(3, '0')}`);
         }
    });
  }, [empresaId, fecha, refreshTrigger, facturaBloqueada]);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    setEmpresaId(nuevaEmpresa);
    const newSettings = { ...allSettings, empresaActiva: nuevaEmpresa };
    setAllSettings(newSettings);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
  };

  const guardarDatosEmisor = async () => {
      const newSettings = { ...allSettings };
      if (!newSettings.datosFacturacion) newSettings.datosFacturacion = {};
      newSettings.datosFacturacion[empresaId] = {
          nif: miNif, direccion: miDireccion, logo: logo, metodoPago: metodoPago, iban: iban
      };
      setAllSettings(newSettings);
      await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings)
      });
      alert(`✅ Los datos fiscales y el logo de ${empresaId} se han guardado por defecto.`);
  };

  if (!isMounted) return null;

  const textoLimpio = baseImponible.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const baseNum = parseFloat(textoLimpio) || 0;
  const ivaNum = Number(ivaSeleccionado) || 0;
  const cuotaIva = baseNum * (ivaNum / 100);
  const totalFila = baseNum + cuotaIva;
  const totalFinal = totalFila;

  const datosPDF = {
    miEmpresa: empresaId || "Mi Empresa", 
    numeroFactura, 
    fecha: fecha.split('-').reverse().join('/'),
    miNif, miDireccion, logo, metodoPago, iban,
    clienteNombre, clienteNif, clienteDireccion,
    concepto, baseImponible: baseNum.toFixed(2), ivaSeleccionado, cuotaIva, totalFila, totalFinal
  };

  const guardarEnLibroMayor = async () => {
    if (!empresaId) return alert("⚠️ Por favor, selecciona un Espacio de Trabajo.");
    if (!concepto) return alert("⚠️ Rellena el concepto de la factura.");
    if (baseNum <= 0) return alert("⚠️ Introduce un importe válido mayor a 0.");
    
    setIsSaving(true);
    
    try {
      const [y, m, d] = fecha.split('-');
      const fechaFormateada = `${d}/${m}/${y}`;
      
      // 🚀 INYECCIÓN DIRECTA DE LA FACTURA A PRISMA
      const res = await guardarDatoSupabase({
        month: fechaFormateada, 
        total: baseNum, 
        empresaId: empresaId, 
        categoria: "Ventas", 
        isRecurrent: false, 
        iva: ivaSeleccionado, 
        numero_factura: numeroFactura,
        cliente_nombre: clienteNombre, 
        cliente_nif: clienteNif, 
        concepto_detalle: concepto
      });

      if (res.success) {
        setFacturaGuardada(true);
        setFacturaBloqueada(true); 
        setRefreshTrigger(prev => prev + 1); 
        setTimeout(() => setFacturaGuardada(false), 4000);
      } else {
        alert("⚠️ Error al guardar en el Libro Mayor.");
      }
    } catch (error) {
      console.error(error);
      alert("⚠️ Error de conexión al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const prepararNuevaFactura = () => {
     setClienteNombre(""); setClienteNif(""); setClienteDireccion(""); setConcepto(""); setBaseImponible("");
     setFacturaBloqueada(false); 
  };

  const filteredHistorial = historialFacturas.filter((fac: any) => {
     const search = searchTerm.toLowerCase();
     const numFac = fac.numero_factura?.toLowerCase() || "";
     const cliente = fac.cliente_nombre?.toLowerCase() || "";
     const conceptoStr = fac.concepto_detalle?.toLowerCase() || "";
     return numFac.includes(search) || cliente.includes(search) || conceptoStr.includes(search);
  });

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const currentItems = filteredHistorial.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (planActivo === 'loading') {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Verificando nivel de acceso...</h2>
           <p className="text-sm font-medium text-slate-500 mb-6">Comprobando permisos del espacio de trabajo</p>
           
           <div className="bg-slate-900/50 border border-slate-800 px-4 py-2.5 rounded-xl mb-8 flex items-center gap-3 shadow-lg">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Soporte Técnico VIP</p>
                <p className="text-sm font-bold text-blue-400">soporte.taxguard@gmail.com</p>
              </div>
           </div>

           <div className="flex gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></span>
           </div>
        </div>
     );
  }

  return (
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative text-slate-800" translate="no">
          
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/impuestos" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Modelos Tributarios
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/facturas" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Facturación PDF
                </Link>
              </nav>
            </div>
            
            <div className="mt-auto">
              <Link href={planActivo === 'pro' || planActivo === 'autonomo' ? "#" : "/precios"} className={`w-full flex items-center justify-between p-3 rounded-2xl border mb-3 transition cursor-pointer ${planActivo === 'pro' || planActivo === 'autonomo' ? 'bg-emerald-900/20 border-emerald-900/50 hover:bg-emerald-900/40' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${planActivo === 'pro' || planActivo === 'autonomo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className={`text-xs font-bold ${planActivo === 'pro' || planActivo === 'autonomo' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {planActivo === 'pro' ? 'Plan Empresa PRO' : planActivo === 'autonomo' ? 'Plan Autónomo' : 'Suscripción Inactiva'}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${planActivo === 'pro' || planActivo === 'autonomo' ? 'text-emerald-300 bg-emerald-900/50' : 'text-slate-800 bg-white'}`}>
                  {planActivo === 'pro' || planActivo === 'autonomo' ? 'Activa' : 'Activar'}
                </span>
              </Link>
              
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
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Creador de Facturas Oficiales</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Genera PDFs profesionales y regístralos automáticamente en tu nube.</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                 {!facturaBloqueada ? (
                    <button 
                       onClick={guardarEnLibroMayor} 
                       disabled={isSaving || baseNum <= 0}
                       className="w-full sm:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-md disabled:opacity-50"
                    >
                       {isSaving ? "Guardando..." : "1. Guardar Ingreso"}
                    </button>
                 ) : (
                    <button 
                       onClick={prepararNuevaFactura} 
                       className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20"
                    >
                       + Nueva Factura
                    </button>
                 )}
                 
                 {baseNum > 0 && (
                   <PDFDownloadLink document={<FacturaPDF datos={datosPDF} />} fileName={`${numeroFactura}_${empresaId.replace(/\s+/g, '')}.pdf`}>
                     {/* @ts-ignore */}
                     {({ loading }) => (
                       <button disabled={loading} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50">
                         {loading ? "Generando documento..." : "2. Descargar PDF"}
                       </button>
                     )}
                   </PDFDownloadLink>
                 )}
              </div>
            </header>

            {facturaGuardada && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-fade-in-up">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full font-black text-lg shadow-sm">✓</span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Factura registrada con éxito</h4>
                  <p className="text-xs text-emerald-600 font-medium">El ingreso y el IVA ya están sumados en tu Consola General. Ya puedes descargar el PDF.</p>
                </div>
              </div>
            )}

            <div className={`bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto transition ${facturaBloqueada ? 'opacity-80' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2">
                
                <div className="p-5 md:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-white">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Datos del Documento</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nº Factura</label>
                        <input type="text" value={numeroFactura} disabled={facturaBloqueada} onChange={e => setNumeroFactura(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-70 disabled:cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Emisión</label>
                        <input type="date" value={fecha} disabled={facturaBloqueada} onChange={e => setFecha(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-70 disabled:cursor-not-allowed" />
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">Tus Datos Fiscales ({empresaId})</h4>
                        <button onClick={guardarDatosEmisor} disabled={facturaBloqueada} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            💾 Guardar por defecto
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder="Tu NIF/CIF..." disabled={facturaBloqueada} value={miNif} onChange={e => setMiNif(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-70 disabled:cursor-not-allowed" />
                        <input type="text" placeholder="Tu Dirección Legal..." disabled={facturaBloqueada} value={miDireccion} onChange={e => setMiDireccion(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-70 disabled:cursor-not-allowed" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Logo de Empresa</label>
                            <input type="file" accept="image/*" disabled={facturaBloqueada} onChange={handleLogoUpload} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50" />
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
                            <div className="flex gap-2">
                               <select value={metodoPago} disabled={facturaBloqueada} onChange={e => setMetodoPago(e.target.value)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none w-1/3 disabled:opacity-70">
                                  <option value="Transferencia">Banco</option>
                                  <option value="Efectivo">Efectivo</option>
                                  <option value="Tarjeta">Tarjeta</option>
                               </select>
                               {metodoPago === "Transferencia" && (
                                  <input type="text" placeholder="IBAN: ESXX..." disabled={facturaBloqueada} value={iban} onChange={e => setIban(e.target.value)} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none disabled:opacity-70" />
                               )}
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Datos del Cliente receptor</h4>
                      <div className="space-y-4">
                        <input type="text" placeholder="Nombre de la empresa o cliente..." disabled={facturaBloqueada} value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <input type="text" placeholder="NIF/CIF del cliente..." disabled={facturaBloqueada} value={clienteNif} onChange={e => setClienteNif(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed" />
                           <input type="text" placeholder="Dirección del cliente..." disabled={facturaBloqueada} value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 md:p-8 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Conceptos y Cantidades</h3>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descripción del Servicio</label>
                        <input type="text" placeholder="Ej: Consultoría web y marketing..." disabled={facturaBloqueada} value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Imponible (€)</label>
                          <input type="text" inputMode="decimal" placeholder="0.00" disabled={facturaBloqueada} value={baseImponible} onChange={e => setBaseImponible(e.target.value)} className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Impuesto Aplicado</label>
                          <select value={ivaSeleccionado} disabled={facturaBloqueada} onChange={(e) => setIvaSeleccionado(e.target.value)} className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed">
                              <option value="21">IVA General (21%)</option>
                              <option value="10">IVA Reducido (10%)</option>
                              <option value="4">IVA Superreducido (4%)</option>
                              <option value="0">Exento de IVA (0%)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 bg-white p-6 rounded-2xl border border-slate-200 shadow-md relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                     <div className="space-y-3 mb-5">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500 font-medium">Subtotal (Base Imponible)</span>
                           <span className="font-bold text-slate-700">{baseNum.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500 font-medium">Impuestos (IVA {ivaSeleccionado}%)</span>
                           <span className="font-bold text-emerald-600">+{cuotaIva.toFixed(2)} €</span>
                        </div>
                     </div>
                     <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total a Cobrar</span>
                        <span className="text-4xl font-black text-blue-600 tracking-tight">{totalFinal.toFixed(2)} €</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto mt-12 mb-10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                  <h2 className="text-lg font-black text-slate-900">Historial de Ingresos ({empresaId})</h2>
                  <input
                     type="text"
                     placeholder="🔍 Buscar cliente, factura o concepto..."
                     value={searchTerm}
                     onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                     className="w-full sm:w-72 p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
              </div>
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                       <thead>
                          <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                             <th className="p-4 md:p-5">Nº / Fecha</th>
                             <th className="p-4 md:p-5">Cliente</th>
                             <th className="p-4 md:p-5">Concepto</th>
                             <th className="p-4 md:p-5 text-right">Base</th>
                             <th className="p-4 md:p-5 text-right">IVA</th>
                             <th className="p-4 md:p-5 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {currentItems.length === 0 ? (
                             <tr><td colSpan={6} className="p-8 text-center text-sm font-medium text-slate-400">No hay facturas que coincidan con la búsqueda.</td></tr>
                          ) : (
                             currentItems.map((fac, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition">
                                   <td className="p-4 md:p-5">
                                      <div className="flex flex-col">
                                         <span className="text-sm font-bold text-slate-800">{fac.numero_factura || 'Manual'}</span>
                                         <span className="text-xs text-slate-400 font-medium">{fac.name}</span>
                                      </div>
                                   </td>
                                   <td className="p-4 md:p-5">
                                      <div className="flex flex-col">
                                         <span className="text-sm font-bold text-slate-700">{fac.cliente_nombre || 'Sin cliente'}</span>
                                         <span className="text-[10px] text-slate-400 font-medium">{fac.cliente_nif || '-'}</span>
                                      </div>
                                   </td>
                                   <td className="p-4 md:p-5">
                                      <div className="text-sm text-slate-600 truncate max-w-[200px]" title={fac.concepto_detalle}>
                                         {fac.concepto_detalle || 'Ingreso General'}
                                      </div>
                                   </td>
                                   <td className="p-4 md:p-5 text-sm font-bold text-slate-700 text-right">{Number(fac.total).toFixed(2)} €</td>
                                   <td className="p-4 md:p-5 text-sm font-bold text-slate-500 text-right">{fac.iva}%</td>
                                   <td className="p-4 md:p-5 text-sm font-black text-emerald-600 text-right">
                                      {(Number(fac.total) * (1 + Number(fac.iva) / 100)).toFixed(2)} €
                                   </td>
                                </tr>
                             ))
                          )}
                       </tbody>
                    </table>
                 </div>
                 
                 {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                       <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition shadow-sm"
                       >
                          Anterior
                       </button>
                       <span className="text-xs font-semibold text-slate-500">
                          Página <span className="font-black text-slate-700">{currentPage}</span> de {totalPages}
                       </span>
                       <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition shadow-sm"
                       >
                          Siguiente
                       </button>
                    </div>
                 )}
              </div>
            </div>

            <div className="h-10"></div>
          </main>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30" translate="no">
          <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md fixed top-0 w-full z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-10 h-10 bg-white rounded-xl p-1 object-contain" />
                <span className="text-2xl font-black tracking-tight text-white">TaxGuard<span className="text-blue-500">AI</span></span>
              </div>
              <div className="flex items-center gap-4">
                <SignInButton mode="modal">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition backdrop-blur-sm border border-white/5">
                    Acceso a Clientes
                  </button>
                </SignInButton>
              </div>
            </div>
          </nav>

          <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8 max-w-4xl mx-auto">
                El primer Director Financiero con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Inteligencia Artificial</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium">
                Automatiza tu contabilidad, escanea facturas al instante y genera los modelos oficiales de Hacienda sin depender de terceros.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignInButton mode="modal">
                  <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl border border-blue-400/20">
                    Iniciar Sesión
                  </button>
                </SignInButton>
                <Link href="/precios" className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl border border-slate-700">
                  Ver Planes y Precios
                </Link>
              </div>
            </div>
          </div>
          <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm relative z-10 bg-slate-950">
            <p>© {new Date().getFullYear()} TaxGuard AI. Todos los derechos reservados.</p>
          </footer>
        </div>
      </Show>
    </>
  );
}