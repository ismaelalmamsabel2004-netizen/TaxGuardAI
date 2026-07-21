"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton, Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, Image } from '@react-pdf/renderer';

import { obtenerDatosSupabase, guardarDatoSupabase, editarDatoSupabase } from '../actions';

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
  logoText: { fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5, marginBottom: 4 },
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
  tableHeaderCell: { paddingVertical: 10, paddingHorizontal: 4, fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { paddingVertical: 12, paddingHorizontal: 4, fontSize: 10, color: '#334155', lineHeight: 1.4 },
  colCant: { width: '8%', textAlign: 'center' },
  colConcepto: { width: '38%' },
  colPrecio: { width: '15%', textAlign: 'right' },
  colBase: { width: '15%', textAlign: 'right' },
  colIva: { width: '9%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
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
          {datos.logo && (
             <Image src={{ uri: datos.logo, method: 'GET', headers: { 'Cache-Control': 'no-cache' }, body: '' }} style={styles.logoImage} />
          )}
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
          <Text style={[styles.tableHeaderCell, styles.colCant]}>CANT</Text>
          <Text style={[styles.tableHeaderCell, styles.colConcepto]}>CONCEPTO</Text>
          <Text style={[styles.tableHeaderCell, styles.colPrecio]}>PRECIO UN.</Text>
          <Text style={[styles.tableHeaderCell, styles.colBase]}>BASE</Text>
          <Text style={[styles.tableHeaderCell, styles.colIva]}>IVA %</Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
        </View>
        {datos.lineasFactura.map((linea: any, index: number) => {
          const importe = Number(linea.cantidad) * Number(linea.precio);
          return (
            <View key={linea.id || index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colCant]}>{linea.cantidad}</Text>
              <Text style={[styles.tableCell, styles.colConcepto]}>{linea.concepto}</Text>
              <Text style={[styles.tableCell, styles.colPrecio]}>{Number(linea.precio).toFixed(2)} €</Text>
              <Text style={[styles.tableCell, styles.colBase]}>{importe.toFixed(2)} €</Text>
              <Text style={[styles.tableCell, styles.colIva]}>{datos.ivaSeleccionado}%</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{(importe * (1 + datos.ivaNum/100)).toFixed(2)} €</Text>
            </View>
          );
        })}
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
             
             {/* 🚀 FIX: AÑADIDA LÍNEA DE RETENCIÓN IRPF SI ES MAYOR QUE 0 */}
             {datos.cuotaIrpf > 0 && (
                 <View style={styles.totalRow}>
                   <Text style={styles.totalLabel}>Retención IRPF (-{datos.irpfSeleccionado}%):</Text>
                   <Text style={{...styles.totalValue, color: '#ef4444'}}>-{datos.cuotaIrpf.toFixed(2)} €</Text>
                 </View>
             )}

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
  
  const [lineasFactura, setLineasFactura] = useState([{ id: Date.now(), concepto: "", cantidad: 1, precio: 0 }]);
  
  // 🚀 VARIABLES DE IMPUESTOS (IVA e IRPF)
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");
  const [irpfSeleccionado, setIrpfSeleccionado] = useState("0");

  const [isSaving, setIsSaving] = useState(false);
  const [facturaGuardada, setFacturaGuardada] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [facturaBloqueada, setFacturaBloqueada] = useState(false);
  
  const [historialFacturas, setHistorialFacturas] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [editandoHistorialId, setEditandoHistorialId] = useState<number | null>(null);
  const [editClientData, setEditClientData] = useState({ nombre: "", nif: "" });

  const [planActivo, setPlanActivo] = useState('loading');

  const [clientesCRM, setClientesCRM] = useState<{nombre: string, nif: string, direccion: string}[]>([]);
  const [showCRM, setShowCRM] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [editandoClienteIndex, setEditandoClienteIndex] = useState<number | null>(null);
  const [editCRMData, setEditCRMData] = useState({ nombre: "", nif: "", direccion: "" });
  
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState({ nombre: "", nif: "", direccion: "" });

  useEffect(() => {
    setIsMounted(true);
    
    if (!isLoaded) return;
    if (!isSignedIn) return;

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((data: any) => {
         const planDetectado = data.planSuscripcion || 'free';
         if (planDetectado === 'free') { router.push('/precios'); return; }

         setPlanActivo(planDetectado);
         setAllSettings(data);
         const listaEmpresas = data.empresas || ["Alperez"];
         setEmpresas(listaEmpresas);
         const activa = data.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);

         if (data.crm && data.crm[activa]) setClientesCRM(data.crm[activa]);
         else setClientesCRM([]);
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
    
    if (newSettings.crm && newSettings.crm[nuevaEmpresa]) setClientesCRM(newSettings.crm[nuevaEmpresa]);
    else setClientesCRM([]);

    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings)
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          const base64Logo = event.target?.result as string;
          setLogo(base64Logo);
          
          const newSettings = { ...allSettings };
          if (!newSettings.datosFacturacion) newSettings.datosFacturacion = {};
          if (!newSettings.datosFacturacion[empresaId]) newSettings.datosFacturacion[empresaId] = {};
          newSettings.datosFacturacion[empresaId].logo = base64Logo;
          
          setAllSettings(newSettings);
          await fetch('/api/settings', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings)
          });
      };
      reader.readAsDataURL(file);
  };

  const quitarLogo = async () => {
      setLogo(null);
      const newSettings = { ...allSettings };
      if (newSettings.datosFacturacion && newSettings.datosFacturacion[empresaId]) {
          newSettings.datosFacturacion[empresaId].logo = null;
      }
      setAllSettings(newSettings);
      await fetch('/api/settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings)
      });
  };

  const guardarDatosEmisor = async () => {
      const newSettings = { ...allSettings };
      if (!newSettings.datosFacturacion) newSettings.datosFacturacion = {};
      if (!newSettings.datosFacturacion[empresaId]) newSettings.datosFacturacion[empresaId] = {};
      
      newSettings.datosFacturacion[empresaId] = {
          ...newSettings.datosFacturacion[empresaId],
          nif: miNif, direccion: miDireccion, metodoPago: metodoPago, iban: iban
      };
      
      setAllSettings(newSettings);
      await fetch('/api/settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings)
      });
      alert(`✅ Los datos fiscales de ${empresaId} se han guardado por defecto.`);
  };

  const addLinea = () => setLineasFactura([...lineasFactura, { id: Date.now(), concepto: "", cantidad: 1, precio: 0 }]);
  const removeLinea = (id: number) => setLineasFactura(lineasFactura.filter(l => l.id !== id));
  const updateLinea = (id: number, campo: string, valor: any) => {
      setLineasFactura(lineasFactura.map(l => l.id === id ? { ...l, [campo]: valor } : l));
  };

  // 🚀 LÓGICA MATEMÁTICA CON IRPF
  const baseNum = lineasFactura.reduce((acc, line) => acc + (Number(line.cantidad) * Number(line.precio)), 0);
  const ivaNum = Number(ivaSeleccionado) || 0;
  const cuotaIva = baseNum * (ivaNum / 100);
  
  const irpfNum = Number(irpfSeleccionado) || 0;
  const cuotaIrpf = baseNum * (irpfNum / 100);
  
  // Total a Pagar = Base + IVA - IRPF
  const totalFinal = baseNum + cuotaIva - cuotaIrpf;

  const datosPDF = {
    miEmpresa: empresaId || "Mi Empresa", 
    numeroFactura, 
    fecha: fecha.split('-').reverse().join('/'),
    miNif, miDireccion, logo, metodoPago, iban,
    clienteNombre, clienteNif, clienteDireccion,
    lineasFactura, baseImponible: baseNum.toFixed(2), 
    ivaSeleccionado, ivaNum, cuotaIva, 
    irpfSeleccionado, cuotaIrpf, 
    totalFinal
  };

  const guardarEnLibroMayor = async () => {
    if (!empresaId) return alert("⚠️ Por favor, selecciona un Espacio de Trabajo.");
    if (lineasFactura.some(l => !l.concepto)) return alert("⚠️ Rellena la descripción de todos los conceptos de la factura.");
    if (baseNum <= 0) return alert("⚠️ Introduce un importe válido mayor a 0.");
    
    setIsSaving(true);
    
    try {
      const [y, m, d] = fecha.split('-');
      const fechaFormateada = `${d}/${m}/${y}`;
      // Guardamos la información del IRPF en el detalle para que quede constancia
      const conceptoUnificado = lineasFactura.map(l => `${l.cantidad}x ${l.concepto}`).join(' | ') + (irpfNum > 0 ? ` (Retención IRPF: -${irpfNum}%)` : "");

      const res = await guardarDatoSupabase({
        month: fechaFormateada, total: baseNum, empresaId: empresaId, categoria: "Ventas", 
        isRecurrent: false, iva: ivaSeleccionado, numero_factura: numeroFactura,
        cliente_nombre: clienteNombre, cliente_nif: clienteNif, concepto_detalle: conceptoUnificado
      });

      if (res.success) {
        if (clienteNombre) {
            const newSettings = { ...allSettings };
            if (!newSettings.crm) newSettings.crm = {};
            if (!newSettings.crm[empresaId]) newSettings.crm[empresaId] = [];
            
            const crmList = newSettings.crm[empresaId];
            const existingIdx = crmList.findIndex((c: any) => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
            const clientData = { nombre: clienteNombre, nif: clienteNif, direccion: clienteDireccion };
            
            if (existingIdx >= 0) crmList[existingIdx] = clientData;
            else crmList.push(clientData);
            
            setAllSettings(newSettings);
            setClientesCRM(crmList);
            fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) });
        }

        setFacturaGuardada(true);
        setFacturaBloqueada(true); 
        setRefreshTrigger(prev => prev + 1); 
        setTimeout(() => setFacturaGuardada(false), 4000);
      } else {
        alert("⚠️ Error al guardar en el Libro Mayor.");
      }
    } catch (error) {
      alert("⚠️ Error de conexión al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const prepararNuevaFactura = () => {
     setClienteNombre(""); setClienteNif(""); setClienteDireccion(""); 
     setLineasFactura([{ id: Date.now(), concepto: "", cantidad: 1, precio: 0 }]);
     setFacturaBloqueada(false); 
  };

  const guardarNuevoClienteCRM = async () => {
      if (!nuevoClienteData.nombre) return alert("El nombre del cliente es obligatorio.");
      const newSettings = { ...allSettings };
      if (!newSettings.crm) newSettings.crm = {};
      if (!newSettings.crm[empresaId]) newSettings.crm[empresaId] = [];

      newSettings.crm[empresaId].push(nuevoClienteData);
      setAllSettings(newSettings);
      setClientesCRM(newSettings.crm[empresaId]);
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) });
      
      setShowNuevoCliente(false);
      setNuevoClienteData({ nombre: "", nif: "", direccion: "" });
  };

  const guardarCRMEditado = async () => {
      const newSettings = { ...allSettings };
      if (!newSettings.crm) newSettings.crm = {};
      newSettings.crm[empresaId] = [...clientesCRM];
      
      setAllSettings(newSettings);
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) });
      setEditandoClienteIndex(null);
  };

  const eliminarClienteCRM = async (index: number) => {
      if(!window.confirm("¿Seguro que deseas borrar este cliente de tu agenda?")) return;
      const newList = clientesCRM.filter((_, i) => i !== index);
      setClientesCRM(newList);
      
      const newSettings = { ...allSettings };
      if (!newSettings.crm) newSettings.crm = {};
      newSettings.crm[empresaId] = newList;
      
      setAllSettings(newSettings);
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) });
  };

  const iniciarEdicionCliente = (fac: any) => {
     setEditandoHistorialId(fac.id);
     setEditClientData({ nombre: fac.cliente_nombre || "", nif: fac.cliente_nif || "" });
  };

  const guardarEdicionHistorial = async (fac: any) => {
      try {
          const res = await editarDatoSupabase({
              id: fac.id, month: fac.name, total: fac.total, categoria: fac.categoria, iva: fac.iva,
              cliente_nombre: editClientData.nombre, cliente_nif: editClientData.nif
          });
          if (res.success) {
              setEditandoHistorialId(null);
              setRefreshTrigger(prev => prev + 1);
          }
      } catch(e) { alert("Error al actualizar"); }
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

  const clientesFiltrados = clientesCRM.filter(c => c.nombre.toLowerCase().includes(clienteNombre.toLowerCase()));
  if (!isMounted) return null;

  // 🚀 PANTALLA DE CARGA ELEGANTE
  if (planActivo === 'loading' && isSignedIn) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Preparando entorno de facturación...</h2>
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2h-2a2 2 0 01-2-2z"/></svg>
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
            
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Creador de Facturas</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Genera PDFs profesionales y súbelos a tu Libro Mayor en 1 clic.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <button onClick={prepararNuevaFactura} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Nueva Factura
                 </button>
                 {facturaBloqueada && (
                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                       ✅ Guardada en Libro Mayor
                    </span>
                 )}
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-6">
                
                {/* DATOS DEL EMISOR Y LOGO */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-bl-full pointer-events-none"></div>
                   
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 1. Tus Datos Fiscales
                      </h3>
                      <button onClick={guardarDatosEmisor} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md transition border border-slate-200">
                         💾 Guardar como predeterminado
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                         <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tu NIF / CIF</label>
                           <input type="text" value={miNif} onChange={(e) => setMiNif(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tu Dirección Completa</label>
                           <input type="text" value={miDireccion} onChange={(e) => setMiDireccion(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nº de Factura</label>
                            <input type="text" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Fecha Emisión</label>
                               <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Logo Empresa (Opcional)</label>
                               {logo ? (
                                   <div className="flex items-center gap-2 mt-1">
                                      <img src={logo} alt="Logo Empresa" className="h-8 object-contain rounded border border-slate-200 p-0.5 bg-white" />
                                      <button onClick={quitarLogo} className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-100 hover:bg-rose-100 transition">
                                          Quitar Logo
                                      </button>
                                   </div>
                               ) : (
                                   <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* 🚀 DATOS DEL CLIENTE CON MINI-CRM */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> 2. Facturar a (Cliente)
                      </h3>
                      <button onClick={() => setShowCRMModal(true)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md transition border border-slate-200 flex items-center gap-1">
                         👥 Gestor de Clientes ({clientesCRM.length})
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nombre del Cliente</label>
                        <input 
                           type="text" 
                           value={clienteNombre} 
                           onChange={(e) => {
                               setClienteNombre(e.target.value);
                               setShowCRM(true);
                           }} 
                           onFocus={() => setShowCRM(true)}
                           onBlur={() => setTimeout(() => setShowCRM(false), 200)}
                           className="w-full p-2.5 bg-emerald-50/30 border border-emerald-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" 
                           placeholder="Ej: Zona Alpha S.L."
                        />
                        {showCRM && clientesFiltrados.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto">
                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contactos Recurrentes</span>
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-sm">{clientesFiltrados.length}</span>
                                </div>
                                {clientesFiltrados.map((c, idx) => (
                                    <div 
                                        key={idx} 
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition flex justify-between items-center"
                                        onClick={() => {
                                            setClienteNombre(c.nombre);
                                            setClienteNif(c.nif);
                                            setClienteDireccion(c.direccion);
                                            setShowCRM(false);
                                        }}
                                    >
                                        <div>
                                           <div className="text-xs font-bold text-slate-800">{c.nombre}</div>
                                           <div className="text-[10px] text-slate-500 mt-0.5">NIF: {c.nif}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">NIF / CIF del Cliente</label>
                        <input type="text" value={clienteNif} onChange={(e) => setClienteNif(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dirección del Cliente</label>
                        <input type="text" value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                   </div>
                </div>

                {/* CONCEPTOS */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-orange-500 rounded-full"></span> 3. Líneas de Factura
                      </h3>
                   </div>
                   
                   <div className="space-y-3">
                      {lineasFactura.map((linea, idx) => (
                        <div key={linea.id} className="flex flex-col sm:flex-row gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="w-full sm:w-16">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cant</label>
                              <input type="number" min="1" value={linea.cantidad} onChange={(e) => updateLinea(linea.id, 'cantidad', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm font-bold outline-none text-center" />
                           </div>
                           <div className="w-full sm:flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Concepto / Descripción</label>
                              <input type="text" value={linea.concepto} onChange={(e) => updateLinea(linea.id, 'concepto', e.target.value)} placeholder="Ej: Servicios de consultoría" className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none" />
                           </div>
                           <div className="w-full sm:w-32">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precio Un. (€)</label>
                              <input type="number" step="0.01" value={linea.precio} onChange={(e) => updateLinea(linea.id, 'precio', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm font-bold outline-none text-right" />
                           </div>
                           {lineasFactura.length > 1 && (
                              <button onClick={() => removeLinea(linea.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition mb-[1px]">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                           )}
                        </div>
                      ))}
                   </div>
                   
                   <button onClick={addLinea} className="mt-4 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-1">
                      + Añadir Concepto
                   </button>
                </div>
              </div>

              {/* PANEL LATERAL: TOTALES Y ACCIONES */}
              <div className="space-y-6">
                 
                 <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-bl-full pointer-events-none"></div>
                    <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Resumen Económico</h3>
                    
                    <div className="space-y-4 mb-6">
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400 font-medium">Subtotal (Base)</span>
                          <span className="text-base font-bold">{baseNum.toFixed(2)} €</span>
                       </div>
                       
                       <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                             <span className="text-sm text-slate-400 font-medium">Impuestos</span>
                             <select value={ivaSeleccionado} onChange={(e) => setIvaSeleccionado(e.target.value)} className="mt-1 bg-slate-800 text-xs text-white border border-slate-700 rounded p-1 outline-none">
                                <option value="21">IVA 21%</option>
                                <option value="10">IVA 10%</option>
                                <option value="4">IVA 4%</option>
                                <option value="0">Exento (0%)</option>
                             </select>
                          </div>
                          <span className="text-base font-bold text-slate-300">+{cuotaIva.toFixed(2)} €</span>
                       </div>

                       {/* 🚀 NUEVA SECCIÓN DE RETENCIÓN IRPF */}
                       <div className="flex justify-between items-center pt-2">
                          <div className="flex flex-col">
                             <span className="text-sm text-slate-400 font-medium">Retención IRPF</span>
                             <select value={irpfSeleccionado} onChange={(e) => setIrpfSeleccionado(e.target.value)} className="mt-1 bg-slate-800 text-xs text-white border border-slate-700 rounded p-1 outline-none">
                                <option value="0">Sin retención (0%)</option>
                                <option value="7">Nuevos autónomos (7%)</option>
                                <option value="15">Profesionales (15%)</option>
                             </select>
                          </div>
                          {cuotaIrpf > 0 ? (
                              <span className="text-base font-bold text-rose-500">-{cuotaIrpf.toFixed(2)} €</span>
                          ) : (
                              <span className="text-base font-bold text-slate-500">0.00 €</span>
                          )}
                       </div>

                    </div>
                    
                    <div className="border-t border-slate-700 pt-6">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total a Facturar</span>
                       <span className="text-4xl font-black text-white">{totalFinal.toFixed(2)} €</span>
                    </div>

                    <div className="mt-8 space-y-3">
                       {isMounted && (
                           <PDFDownloadLink 
                               document={<FacturaPDF datos={datosPDF} />} 
                               fileName={`${numeroFactura}_${clienteNombre || 'Cliente'}.pdf`}
                           >
                               {/* @ts-ignore */}
                               {({ loading }) => (
                                   <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                      {loading ? "Generando PDF..." : "Descargar Factura PDF"}
                                   </button>
                               )}
                           </PDFDownloadLink>
                       )}
                       
                       <button 
                          onClick={guardarEnLibroMayor} 
                          disabled={isSaving || facturaBloqueada}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl border border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                          {isSaving ? "Guardando..." : facturaGuardada ? "¡Factura Registrada!" : "Registrar en Libro Mayor"}
                       </button>
                    </div>
                 </div>

                 {/* MÉTODO DE PAGO */}
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Datos de Cobro</h3>
                    <div className="space-y-4">
                       <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Método Preferido</label>
                         <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none">
                            <option value="Transferencia">Transferencia Bancaria</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta / TPV</option>
                            <option value="Domiciliación">Domiciliación SEPA</option>
                         </select>
                       </div>
                       {metodoPago === 'Transferencia' && (
                         <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tu IBAN</label>
                           <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="ESXX XXXX XXXX..." className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none" />
                         </div>
                       )}
                    </div>
                 </div>

              </div>
            </div>

            {/* TABLA DE HISTORIAL RÁPIDO */}
            <div className="mt-10 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <h3 className="text-md font-bold text-slate-900">Historial de Facturas Emitidas</h3>
                       <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-full">{historialFacturas.length}</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="🔍 Buscar factura, cliente..." 
                      value={searchTerm}
                      onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                      className="w-48 sm:w-64 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                    />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left whitespace-nowrap">
                       <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <tr>
                             <th className="px-6 py-4">Nº Factura</th>
                             <th className="px-6 py-4">Fecha</th>
                             <th className="px-6 py-4">Cliente / NIF</th>
                             <th className="px-6 py-4">Base Imponible</th>
                             <th className="px-6 py-4">Estado</th>
                             <th className="px-6 py-4 text-right">Acción</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                          {currentItems.map((fac: any) => {
                             if (editandoHistorialId === fac.id) {
                                 return (
                                     <tr key={fac.id} className="bg-blue-50/30">
                                         <td className="px-6 py-3 font-bold text-slate-900">{fac.numero_factura || 'S/N'}</td>
                                         <td className="px-6 py-3">{fac.name}</td>
                                         <td className="px-6 py-3 space-y-1">
                                             <input type="text" value={editClientData.nombre} onChange={(e) => setEditClientData({...editClientData, nombre: e.target.value})} placeholder="Nombre Cliente" className="w-full p-1 border border-blue-300 rounded text-xs outline-none block" />
                                             <input type="text" value={editClientData.nif} onChange={(e) => setEditClientData({...editClientData, nif: e.target.value})} placeholder="NIF Cliente" className="w-full p-1 border border-blue-300 rounded text-xs outline-none block" />
                                         </td>
                                         <td className="px-6 py-3 font-bold">{fac.total} €</td>
                                         <td className="px-6 py-3">En edición</td>
                                         <td className="px-6 py-3 text-right space-x-3">
                                            <button onClick={() => guardarEdicionHistorial(fac)} className="text-emerald-600 font-bold text-xs hover:underline">Guardar</button>
                                            <button onClick={() => setEditandoHistorialId(null)} className="text-slate-500 font-bold text-xs hover:underline">Cancelar</button>
                                         </td>
                                     </tr>
                                 );
                             }

                             return (
                                 <tr key={fac.id} className="hover:bg-slate-50/80 transition">
                                     <td className="px-6 py-4 font-bold text-slate-900">{fac.numero_factura || 'S/N'}</td>
                                     <td className="px-6 py-4 text-slate-500">{fac.name}</td>
                                     <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{fac.cliente_nombre || 'Sin asignar'}</div>
                                        <div className="text-[10px] text-slate-400">NIF: {fac.cliente_nif || '-'}</div>
                                     </td>
                                     <td className="px-6 py-4 font-black text-emerald-600">+{Number(fac.total).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                                     <td className="px-6 py-4">
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider border border-emerald-200">Emitida</span>
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <button onClick={() => iniciarEdicionCliente(fac)} className="text-blue-500 hover:text-blue-700 font-bold text-[10px] uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-md transition border border-blue-100">
                                             Editar Cliente
                                         </button>
                                     </td>
                                 </tr>
                             );
                          })}
                          {filteredHistorial.length === 0 && (
                             <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-slate-400">No hay facturas registradas en este espacio de trabajo.</td></tr>
                          )}
                       </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50">Anterior</button>
                     <span className="text-xs font-semibold text-slate-500">Página <span className="font-black text-slate-700">{currentPage}</span> de {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50">Siguiente</button>
                  </div>
                )}
            </div>

            <div className="h-20"></div>
          </main>
        </div>

        {/* 🚀 MODAL DEL GESTOR CRM */}
        {showCRMModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" translate="no">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                   <div>
                       <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                           👥 Gestor de Clientes (CRM)
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">Directorio de {empresaId}. Los clientes se añaden automáticamente al facturar.</p>
                   </div>
                   <div className="flex items-center gap-3">
                       <button onClick={() => setShowNuevoCliente(!showNuevoCliente)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm">
                           {showNuevoCliente ? "Cancelar" : "+ Nuevo Cliente"}
                       </button>
                       <button onClick={() => setShowCRMModal(false)} className="text-slate-400 hover:text-rose-500 transition p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                   </div>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                   
                   {showNuevoCliente && (
                       <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 mb-6 shadow-inner">
                           <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4">Añadir Contacto Manual</h4>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nombre</label>
                                  <input type="text" value={nuevoClienteData.nombre} onChange={e => setNuevoClienteData({...nuevoClienteData, nombre: e.target.value})} placeholder="Ej: Mercadona SA" className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">NIF / CIF</label>
                                  <input type="text" value={nuevoClienteData.nif} onChange={e => setNuevoClienteData({...nuevoClienteData, nif: e.target.value})} placeholder="A12345678" className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dirección</label>
                                  <input type="text" value={nuevoClienteData.direccion} onChange={e => setNuevoClienteData({...nuevoClienteData, direccion: e.target.value})} placeholder="Calle Principal 1" className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                               </div>
                           </div>
                           <button onClick={guardarNuevoClienteCRM} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:bg-blue-700 w-full sm:w-auto">
                               Guardar en Agenda
                           </button>
                       </div>
                   )}

                   {clientesCRM.length === 0 && !showNuevoCliente ? (
                      <div className="text-center py-12">
                         <span className="text-4xl block mb-4">📇</span>
                         <p className="text-sm font-bold text-slate-600 mb-1">Tu agenda está vacía</p>
                         <p className="text-xs text-slate-400">Rellena los datos de un cliente y pulsa "Registrar en Libro Mayor" para guardarlo automáticamente, o pulsa "+ Nuevo Cliente".</p>
                      </div>
                   ) : (
                      clientesCRM.map((c, index) => (
                         <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 transition hover:border-blue-200 hover:shadow-md">
                            {editandoClienteIndex === index ? (
                               <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nombre</label>
                                     <input type="text" value={editCRMData.nombre} onChange={e => setEditCRMData({...editCRMData, nombre: e.target.value})} className="w-full p-2.5 border border-blue-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                  </div>
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">NIF / CIF</label>
                                     <input type="text" value={editCRMData.nif} onChange={e => setEditCRMData({...editCRMData, nif: e.target.value})} className="w-full p-2.5 border border-blue-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                  </div>
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Dirección</label>
                                     <input type="text" value={editCRMData.direccion} onChange={e => setEditCRMData({...editCRMData, direccion: e.target.value})} className="w-full p-2.5 border border-blue-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                  </div>
                               </div>
                            ) : (
                               <div className="flex-1">
                                  <h4 className="text-sm font-black text-slate-900">{c.nombre}</h4>
                                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                                     <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold mr-2">NIF: {c.nif}</span>
                                     📍 {c.direccion}
                                  </p>
                               </div>
                            )}
                            
                            <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-0 md:pt-0">
                               {editandoClienteIndex === index ? (
                                  <>
                                     <button onClick={() => {
                                        const newList = [...clientesCRM];
                                        newList[index] = editCRMData;
                                        setClientesCRM(newList);
                                        guardarCRMEditado();
                                     }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[11px] font-bold transition shadow-sm">Guardar</button>
                                     <button onClick={() => setEditandoClienteIndex(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[11px] font-bold transition border border-slate-200">Cancelar</button>
                                  </>
                                ) : (
                                  <>
                                     <button onClick={() => {
                                         setClienteNombre(c.nombre);
                                         setClienteNif(c.nif);
                                         setClienteDireccion(c.direccion);
                                         setShowCRMModal(false);
                                     }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[11px] font-bold transition shadow-sm">Usar en Factura</button>
                                     <button onClick={() => { setEditandoClienteIndex(index); setEditCRMData(c); }} className="bg-slate-50 hover:bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[11px] font-bold transition border border-slate-200 hover:border-blue-200">Editar</button>
                                     <button onClick={() => eliminarClienteCRM(index)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[11px] font-bold transition border border-rose-100">Borrar</button>
                                  </>
                               )}
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        )}
      </Show>

      {/* RUTA DE ESCAPE PARA LOS NO REGISTRADOS */}
      <Show when="signed-out">
         <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center" translate="no">
            <div className="text-center">
               <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 mx-auto mb-6 shadow-2xl shadow-blue-500/20" />
               <h2 className="text-2xl font-black mb-4">Acceso Restringido</h2>
               <p className="text-slate-400 mb-8 max-w-sm">Esta es una zona privada para clientes de TaxGuard AI. Inicia sesión para continuar.</p>
               <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition">
                  Ir al Inicio
               </Link>
            </div>
         </div>
      </Show>
    </>
  );
}