"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Roboto', backgroundColor: '#ffffff' },
  header: { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 20, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 5 },
  section: { marginBottom: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, color: '#475569', fontWeight: 700 },
  value: { fontSize: 11, color: '#0f172a' },
  totalBox: { marginTop: 20, padding: 20, backgroundColor: '#eff6ff', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: 700, color: '#1e3a8a' },
  totalValue: { fontSize: 20, fontWeight: 700, color: '#2563eb' }
});

const FacturaPDF = ({ datos }: { datos: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}><Text style={styles.title}>{datos.miEmpresa.toUpperCase()}</Text><Text style={styles.subtitle}>FACTURA | {datos.numeroFactura}</Text></View>
      <View style={styles.section}><View style={styles.row}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{datos.clienteNombre}</Text></View></View>
      <View style={styles.section}><Text style={styles.label}>Concepto: {datos.concepto}</Text><View style={styles.row}><Text style={styles.value}>Base:</Text><Text style={styles.value}>{datos.baseImponible} €</Text></View></View>
      <View style={styles.totalBox}><Text style={styles.totalLabel}>TOTAL A PAGAR</Text><Text style={styles.totalValue}>{datos.totalFinal.toFixed(2)} €</Text></View>
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
    fetch(`/api/finances?t=${Date.now()}`).then(r => r.ok ? r.json() : []).then(d => {
        // 🚀 AQUI ESTÁ LA CORRECCIÓN DE TYPESCRIPT (as string[])
        const list = Array.from(new Set(d.map((x:any) => x.empresaId))) as string[];
        setEmpresas(list.length > 0 ? list : ["Mi Primera Empresa"]);
    });
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || "");
  }, []);

  const baseNum = parseFloat(baseImponible.replace(/,/g, '.')) || 0;
  const cuotaIva = baseNum * (Number(ivaSeleccionado) / 100);
  const totalFinal = baseNum + cuotaIva;

  const datosPDF = { miEmpresa: empresaId, numeroFactura, fecha, clienteNombre, clienteNif, concepto, baseImponible: baseNum.toFixed(2), ivaSeleccionado, cuotaIva, totalFila: totalFinal, totalFinal };

  const guardarEnLibroMayor = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ month: fecha, total: baseNum, empresaId, categoria: "Ventas", iva: ivaSeleccionado }) 
      });
      if (res.ok) setFacturaGuardada(true);
    } finally { setIsSaving(false); }
  };

  if (!isMounted) return null;

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans">
        <div className="lg:hidden fixed top-0 w-full p-4 bg-slate-900 text-white z-50 flex justify-between">
          <span>TaxGuard AI</span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
        </div>
        
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 p-6 text-slate-400 transition-transform`}>
          <nav className="space-y-4 mt-16 lg:mt-0">
            <Link href="/" className="block p-4 text-white hover:bg-slate-800 rounded-xl">Consola</Link>
            <Link href="/facturas" className="block p-4 bg-blue-600 text-white rounded-xl font-bold">Facturación PDF</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 pt-24 lg:p-10">
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl border shadow-sm">
            <h1 className="text-2xl font-black mb-6">Generador de Facturas</h1>
            <div className="grid md:grid-cols-2 gap-6">
                <input type="text" placeholder="Cliente" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="p-4 border rounded-xl" />
                <input type="text" inputMode="decimal" placeholder="Base Imponible" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} className="p-4 border rounded-xl" />
            </div>
            <div className="mt-6 flex gap-4">
                <button onClick={guardarEnLibroMayor} className="bg-slate-900 text-white px-6 py-4 rounded-xl font-bold">Guardar en Libro</button>
                <PDFDownloadLink document={<FacturaPDF datos={datosPDF} />} fileName="factura.pdf">
                    <button className="bg-blue-600 text-white px-6 py-4 rounded-xl font-bold">Descargar PDF</button>
                </PDFDownloadLink>
            </div>
          </div>
        </main>
      </div>
    </Show>
  );
}